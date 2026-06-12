const mutableEnv = process.env as Record<string, string | undefined>;

mutableEnv.NODE_ENV ??= 'test';
mutableEnv.APP_ENV ??= 'test';
mutableEnv.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/taxdesk?schema=public';
mutableEnv.AUTH_SECRET ??= 'test-secret-32-chars-minimum-value';
mutableEnv.INTERNAL_JOB_TOKEN ??= 'test-job-token-32-chars-minimum';
mutableEnv.METRICS_TOKEN ??= 'test-metrics-token-32-chars-minimum';
