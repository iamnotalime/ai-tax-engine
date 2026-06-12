create table if not exists data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references app_users(id),
  target_user_id uuid not null references app_users(id),
  request_type text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  payload jsonb not null default '{}',
  error_message text,
  constraint data_subject_requests_type_chk check (request_type in ('export','delete')),
  constraint data_subject_requests_status_chk check (status in ('requested','processing','fulfilled','failed'))
);

create index if not exists data_subject_requests_target_idx on data_subject_requests(target_user_id, requested_at desc);
create index if not exists data_subject_requests_status_idx on data_subject_requests(status, requested_at asc);

create table if not exists retention_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  ai_raw_outputs_redacted int not null default 0,
  cases_deleted int not null default 0,
  error_message text,
  constraint retention_runs_status_chk check (status in ('running','succeeded','failed'))
);
