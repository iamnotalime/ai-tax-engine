alter table app_users alter column updated_at set default now();
update app_users set updated_at = now() where updated_at is null;

alter table reviewer_profiles alter column updated_at set default now();
update reviewer_profiles set updated_at = now() where updated_at is null;

alter table cases alter column updated_at set default now();
update cases set updated_at = now() where updated_at is null;

alter table documents alter column updated_at set default now();
update documents set updated_at = now() where updated_at is null;

alter table tax_issues alter column updated_at set default now();
update tax_issues set updated_at = now() where updated_at is null;

alter table evidence_items alter column updated_at set default now();
update evidence_items set updated_at = now() where updated_at is null;

alter table deliverables alter column updated_at set default now();
update deliverables set updated_at = now() where updated_at is null;

alter table payments alter column updated_at set default now();
update payments set updated_at = now() where updated_at is null;

alter table jobs alter column updated_at set default now();
update jobs set updated_at = now() where updated_at is null;

alter table rate_limit_buckets alter column updated_at set default now();
update rate_limit_buckets set updated_at = now() where updated_at is null;
