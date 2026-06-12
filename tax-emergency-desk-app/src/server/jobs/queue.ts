import { jsonb, sql } from '@/lib/db';
import type { JobRow } from '@/server/db/types';

export async function enqueueJob(jobType: string, payload: Record<string, unknown>, priority = 100, tenantId?: string | null) {
  const [job] = await sql<JobRow[]>`
    insert into jobs (tenant_id, job_type, payload, priority)
    values (${tenantId ?? null}, ${jobType}, ${jsonb(payload)}, ${priority})
    returning *
  `;
  return job;
}

export async function claimNextJob(workerId: string) {
  const [job] = await sql<JobRow[]>`
    with next_job as (
      select id
      from jobs
      where status = 'queued'
      order by priority asc, created_at asc
      for update skip locked
      limit 1
    )
    update jobs
    set
      status = 'running',
      locked_by = ${workerId},
      locked_at = now(),
      started_at = now(),
      attempts = attempts + 1,
      updated_at = now()
    from next_job
    where jobs.id = next_job.id
    returning jobs.*
  `;
  return job ?? null;
}

export async function completeJob(jobId: string) {
  const [job] = await sql<JobRow[]>`
    update jobs
    set status = 'succeeded', completed_at = now(), updated_at = now()
    where id = ${jobId}
    returning *
  `;
  return job;
}

export async function failJob(jobId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const [job] = await sql<JobRow[]>`select * from jobs where id = ${jobId} limit 1`;
  if (!job) throw new Error(`Job not found: ${jobId}`);
  const retry = job.attempts < job.maxAttempts;
  const [updated] = await sql<JobRow[]>`
    update jobs
    set
      status = ${retry ? 'queued' : 'failed'},
      error_message = ${message},
      locked_at = null,
      locked_by = null,
      updated_at = now()
    where id = ${jobId}
    returning *
  `;
  return updated;
}
