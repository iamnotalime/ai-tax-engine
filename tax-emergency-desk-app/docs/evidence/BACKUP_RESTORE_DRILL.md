---
status: pending
owner: platform
approved_at:
approver:
---

# Backup Restore Drill Evidence

Required before production traffic:

- `npm run db:backup` or managed backup completed successfully.
- Restore tested into an isolated database using `npm run db:restore`.
- Application smoke test passed against restored database.
- Recovery time and recovery point documented.

Change `status: pending` to `status: approved` only after a successful restore drill.
