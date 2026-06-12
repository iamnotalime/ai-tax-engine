create table if not exists monitoring_events (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  event_type text not null,
  tenant_id uuid references tenants(id) on delete set null,
  case_id uuid references cases(id) on delete set null,
  labels jsonb not null default '{}',
  value numeric not null default 1,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists monitoring_events_metric_idx on monitoring_events(metric_name, occurred_at desc);
create index if not exists monitoring_events_tenant_idx on monitoring_events(tenant_id, occurred_at desc);

create table if not exists backup_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  backup_path text,
  size_bytes bigint,
  error_message text,
  metadata jsonb not null default '{}',
  constraint backup_runs_status_chk check (status in ('running','succeeded','failed'))
);

create index if not exists backup_runs_status_completed_idx on backup_runs(status, completed_at desc);
