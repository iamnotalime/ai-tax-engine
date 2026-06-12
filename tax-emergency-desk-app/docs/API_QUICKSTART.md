# API Quickstart

## Create user

`POST /api/auth/signup`

```json
{ "email": "user@example.com", "password": "ChangeMe123!", "fullName": "Demo User" }
```

## Create case

`POST /api/cases`

```json
{
  "caseType": "sp2dk_response",
  "title": "SP2DK PPN 2024",
  "taxpayerType": "business",
  "taxpayerName": "PT Contoh Makmur",
  "packageCode": "free_ai_scan",
  "sourceChannel": "google_ads_sp2dk"
}
```

## Upload documents

`POST /api/cases/{caseId}/documents` with multipart field `files`.

## Queue triage

`POST /api/cases/{caseId}/triage`

Then run either:

```bash
npm run worker
```

or trigger one job manually:

```bash
curl -X POST http://localhost:3000/api/internal/jobs/run \
  -H "x-internal-job-token: $INTERNAL_JOB_TOKEN"
```

## Reviewer approval

`POST /api/reviewer/cases/{caseId}/review`

```json
{
  "reviewType": "senior_qc",
  "decision": "approve",
  "comments": "Reviewed against visible documents. No guarantee of outcome."
}
```
