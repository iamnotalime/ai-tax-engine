# Enterprise Production Runbook

## Required Runtime Services

- PostgreSQL 16 with pgvector, automated backups, PITR where available, and restore drills.
- Private S3-compatible object storage with public access blocked, access logs, lifecycle rules, and rotated access keys.
- ClamAV `clamd` reachable from the app network for upload malware scanning.
- External OCR/vision provider with a signed DPA and production SLA.
- OpenAI provider configured through AI SDK v5 with provider storage disabled by app code.
- Temporal cluster reachable from the app and `temporal-worker` process running `npm run temporal:worker`.
- DB worker process running `npm run worker` for housekeeping jobs such as privacy deletion and retention.
- Scheduled retention process running `npm run retention:run` or enqueuing `retention_sweep`.

## Production Environment

`APP_ENV=production` must be paired with:

- `NEXT_PUBLIC_APP_URL` set to the production HTTPS origin.
- `STORAGE_DRIVER=s3`.
- `DOCUMENT_ENCRYPTION_KEY_BASE64` set to a 32-byte base64 key.
- `MALWARE_SCANNING_MODE=clamd`.
- `OCR_PROVIDER=external`.
- `AI_PROVIDER=openai`.
- `JOB_BACKEND=temporal`.
- `KEYVAL_CACHE_ENABLED=true`.
- `REVIEW_ASSIGNMENT_REQUIRED=true`.

## Release Gate

Run before deploy:

```bash
npm ci
npm run secrets:generate
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev --audit-level=high
npm run db:deploy
npm run production:check
```

Run before first customer traffic:

- VAPT/security review completed.
- Legal review completed for Terms, Privacy Policy, DPA, and reviewer contracts.
- Backup restore drill completed.
- ClamAV scanner failure alert tested.
- OCR provider failure alert tested.
- Unauthorized access spike alert tested.
- Data export, data deletion, and retention sweep tested in staging.

## Backup And Restore

Create a database backup:

```bash
BACKUP_DIR=./backups npm run db:backup
```

Restore into an isolated database only:

```bash
RESTORE_CONFIRM=I_UNDERSTAND_THIS_OVERWRITES_DATABASE npm run db:restore -- ./backups/taxdesk-example.dump
```

After a successful restore drill, update `docs/evidence/BACKUP_RESTORE_DRILL.md` to `status: approved`.

## Production Certification Evidence

`npm run production:check` requires these evidence files to contain `status: approved`:

- `docs/evidence/VAPT_APPROVAL.md`
- `docs/evidence/LEGAL_APPROVAL.md`
- `docs/evidence/BACKUP_RESTORE_DRILL.md`
- `docs/evidence/INCIDENT_RESPONSE_DRILL.md`
- `docs/evidence/MONITORING_ALERT_TEST.md`

The command also checks database migrations, S3 put/delete, and ClamAV ping unless `PRODUCTION_CHECK_SKIP_EXTERNALS=true` is set.

## Deployment Template

Use `Dockerfile` and `docker-compose.production.yml` as a reference deployment template. In managed cloud deployments, replace the compose-managed Postgres/MinIO services with managed equivalents and keep the same required environment variables.

Prometheus-style alert examples live in `monitoring/prometheus-rules.yml`.
