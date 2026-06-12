create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_status_chk check (status in ('active','suspended','archived'))
);

create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  role text not null default 'member',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, user_id),
  constraint tenant_memberships_role_chk check (role in ('owner','admin','ops','reviewer','member'))
);

create index if not exists tenant_memberships_user_idx on tenant_memberships(user_id, is_default desc, created_at asc);
create index if not exists tenant_memberships_tenant_idx on tenant_memberships(tenant_id, role);

insert into tenants (slug, name)
values ('default', 'Default Workspace')
on conflict (slug) do update set name = excluded.name, updated_at = now();

insert into tenant_memberships (tenant_id, user_id, role, is_default)
select
  t.id,
  u.id,
  case
    when u.role = 'admin' then 'owner'
    when u.role in ('ops', 'support') then 'ops'
    when u.role in ('tax_associate', 'licensed_tax_consultant') then 'reviewer'
    else 'member'
  end,
  true
from app_users u
cross join tenants t
where t.slug = 'default'
on conflict (tenant_id, user_id) do update set
  role = excluded.role,
  is_default = tenant_memberships.is_default or excluded.is_default,
  updated_at = now();

alter table cases add column if not exists tenant_id uuid references tenants(id);

update cases
set tenant_id = (select id from tenants where slug = 'default')
where tenant_id is null;

alter table cases alter column tenant_id set not null;

create index if not exists cases_tenant_status_idx on cases(tenant_id, status, created_at desc);
create index if not exists cases_tenant_owner_idx on cases(tenant_id, owner_user_id, created_at desc);

alter table jobs add column if not exists tenant_id uuid references tenants(id) on delete set null;

update jobs j
set tenant_id = c.tenant_id
from cases c
where j.tenant_id is null
  and j.payload ? 'caseId'
  and c.id = (j.payload ->> 'caseId')::uuid;

create index if not exists jobs_tenant_queue_idx on jobs(tenant_id, status, priority, created_at);

alter table audit_logs add column if not exists tenant_id uuid references tenants(id) on delete set null;

update audit_logs a
set tenant_id = c.tenant_id
from cases c
where a.tenant_id is null and a.case_id = c.id;

create index if not exists audit_logs_tenant_idx on audit_logs(tenant_id, created_at desc);

alter table data_subject_requests add column if not exists tenant_id uuid references tenants(id) on delete set null;

update data_subject_requests d
set tenant_id = tm.tenant_id
from tenant_memberships tm
where d.tenant_id is null
  and d.target_user_id = tm.user_id
  and tm.is_default = true;

create index if not exists data_subject_requests_tenant_idx on data_subject_requests(tenant_id, requested_at desc);

alter table retention_runs add column if not exists tenant_id uuid references tenants(id) on delete set null;

create index if not exists retention_runs_tenant_idx on retention_runs(tenant_id, started_at desc);

create table if not exists keyval_cache (
  tenant_id uuid not null references tenants(id) on delete cascade,
  namespace text not null,
  key text not null,
  value jsonb not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, namespace, key)
);

create index if not exists keyval_cache_expires_idx on keyval_cache(expires_at);

create index if not exists knowledge_chunks_hybrid_search_idx
on knowledge_chunks
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')));
