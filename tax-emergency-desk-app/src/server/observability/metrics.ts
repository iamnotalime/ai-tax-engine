import { env } from '@/config/env';
import { jsonb, sql } from '@/lib/db';
import { logger } from '@/lib/logger';

type MetricLabelValue = string | number | boolean | null | undefined;
type MetricLabels = Record<string, MetricLabelValue>;

function normalizeLabels(labels: MetricLabels = {}) {
  return Object.fromEntries(
    Object.entries(labels)
      .filter((entry): entry is [string, Exclude<MetricLabelValue, undefined | null>] => entry[1] !== undefined && entry[1] !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export async function recordMonitoringEvent(params: {
  metricName: string;
  eventType: string;
  tenantId?: string | null;
  caseId?: string | null;
  labels?: MetricLabels;
  value?: number;
  payload?: Record<string, unknown>;
}) {
  try {
    await sql`
      insert into monitoring_events (
        metric_name,
        event_type,
        tenant_id,
        case_id,
        labels,
        value,
        payload
      )
      values (
        ${params.metricName},
        ${params.eventType},
        ${params.tenantId ?? null},
        ${params.caseId ?? null},
        ${jsonb(normalizeLabels(params.labels))},
        ${params.value ?? 1},
        ${jsonb(params.payload ?? {})}
      )
    `;
  } catch (error) {
    logger.warn({ error, metricName: params.metricName, eventType: params.eventType }, 'failed to record monitoring event');
  }
}

function escapeLabelValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function labelString(labels: Record<string, string>) {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return '';
  return `{${entries.map(([key, value]) => `${key}="${escapeLabelValue(value)}"`).join(',')}}`;
}

function metricLine(name: string, value: number, labels: Record<string, string> = {}) {
  return `${name}${labelString(labels)} ${Number.isFinite(value) ? value : 0}`;
}

async function eventCounters() {
  return sql<Array<{ metricName: string; labels: Record<string, string>; value: number }>>`
    select metric_name, labels, coalesce(sum(value), 0)::float8 as value
    from monitoring_events
    group by metric_name, labels
    order by metric_name asc
  `;
}

async function latestTimestamp(table: 'backup_runs' | 'retention_runs') {
  const [row] = await sql<Array<{ value: number | null }>>`
    select extract(epoch from max(completed_at))::float8 as value
    from ${sql(table)}
    where status = 'succeeded'
  `;
  return row?.value ?? 0;
}

async function openPrivacyDeleteRequests() {
  const [row] = await sql<Array<{ openCount: number; oldestAgeSeconds: number | null }>>`
    select
      count(*)::int as "openCount",
      extract(epoch from now() - min(requested_at))::float8 as "oldestAgeSeconds"
    from data_subject_requests
    where request_type = 'delete'
      and status in ('requested', 'processing')
  `;
  return {
    openCount: row?.openCount ?? 0,
    oldestAgeSeconds: row?.oldestAgeSeconds ?? 0
  };
}

export async function renderPrometheusMetrics() {
  const [events, lastBackupSuccess, lastRetentionSuccess, privacyDeleteRequests] = await Promise.all([
    eventCounters(),
    latestTimestamp('backup_runs'),
    latestTimestamp('retention_runs'),
    openPrivacyDeleteRequests()
  ]);

  const lines = [
    '# HELP taxdesk_build_info Static application build info.',
    '# TYPE taxdesk_build_info gauge',
    metricLine('taxdesk_build_info', 1, { app_env: env.APP_ENV }),
    '# HELP taxdesk_last_backup_success_timestamp Unix timestamp of the latest successful backup.',
    '# TYPE taxdesk_last_backup_success_timestamp gauge',
    metricLine('taxdesk_last_backup_success_timestamp', lastBackupSuccess),
    '# HELP taxdesk_last_retention_success_timestamp Unix timestamp of the latest successful retention sweep.',
    '# TYPE taxdesk_last_retention_success_timestamp gauge',
    metricLine('taxdesk_last_retention_success_timestamp', lastRetentionSuccess),
    '# HELP taxdesk_open_privacy_delete_requests Number of open data deletion requests.',
    '# TYPE taxdesk_open_privacy_delete_requests gauge',
    metricLine('taxdesk_open_privacy_delete_requests', privacyDeleteRequests.openCount),
    '# HELP taxdesk_oldest_open_privacy_delete_request_age_seconds Age of the oldest open data deletion request.',
    '# TYPE taxdesk_oldest_open_privacy_delete_request_age_seconds gauge',
    metricLine('taxdesk_oldest_open_privacy_delete_request_age_seconds', privacyDeleteRequests.oldestAgeSeconds)
  ];

  const typedEventMetrics = new Set<string>();
  for (const event of events) {
    if (!typedEventMetrics.has(event.metricName)) {
      lines.push(`# TYPE ${event.metricName} counter`);
      typedEventMetrics.add(event.metricName);
    }
    lines.push(metricLine(event.metricName, Number(event.value), event.labels ?? {}));
  }

  return `${lines.join('\n')}\n`;
}
