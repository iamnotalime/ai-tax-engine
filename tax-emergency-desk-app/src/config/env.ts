import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

function loadLocalEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadLocalEnvFile();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  return value;
}, z.boolean());

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

function isValidBase64Key(value: string) {
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.string().default('local'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('taxdesk_session'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_ROOT: z.string().default('./.local/storage'),
  S3_BUCKET: emptyStringToUndefined(z.string()),
  S3_REGION: z.string().default('ap-southeast-3'),
  S3_ENDPOINT: emptyStringToUndefined(z.string().url()),
  S3_ACCESS_KEY_ID: emptyStringToUndefined(z.string()),
  S3_SECRET_ACCESS_KEY: emptyStringToUndefined(z.string()),
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(false),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  MALWARE_SCANNING_MODE: z.enum(['disabled', 'clamd']).default('disabled'),
  CLAMAV_HOST: z.string().default('127.0.0.1'),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  MALWARE_SCAN_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  OCR_PROVIDER: z.enum(['manual', 'external']).default('manual'),
  OCR_ENDPOINT: emptyStringToUndefined(z.string().url()),
  OCR_API_KEY: emptyStringToUndefined(z.string()),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: emptyStringToUndefined(z.string()),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  INTERNAL_JOB_TOKEN: z.string().min(8),
  METRICS_TOKEN: emptyStringToUndefined(z.string()),
  JOB_BACKEND: z.enum(['db', 'temporal']).default('db'),
  TEMPORAL_ADDRESS: z.string().default('127.0.0.1:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('taxdesk-workflows'),
  TEMPORAL_TLS_ENABLED: booleanFromEnv.default(false),
  KEYVAL_CACHE_ENABLED: booleanFromEnv.default(true),
  AI_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  RAG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(24 * 60 * 60),
  AI_RAW_RETENTION_DAYS: z.coerce.number().int().default(30),
  FREE_SCAN_RETENTION_DAYS: z.coerce.number().int().default(30),
  PAID_CASE_RETENTION_DAYS: z.coerce.number().int().default(180),
  RATE_LIMIT_ENABLED: booleanFromEnv.default(true),
  REVIEW_ASSIGNMENT_REQUIRED: booleanFromEnv.optional(),
  DOCUMENT_ENCRYPTION_KEY_BASE64: emptyStringToUndefined(z.string()),
  LOG_LEVEL: z.string().default('info')
}).superRefine((env, ctx) => {
  if (env.DOCUMENT_ENCRYPTION_KEY_BASE64 && !isValidBase64Key(env.DOCUMENT_ENCRYPTION_KEY_BASE64)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DOCUMENT_ENCRYPTION_KEY_BASE64'],
      message: 'DOCUMENT_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.'
    });
  }

  if (env.APP_ENV !== 'production') return;

  if (new URL(env.NEXT_PUBLIC_APP_URL).hostname === 'localhost') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NEXT_PUBLIC_APP_URL'],
      message: 'Production APP_ENV cannot use localhost NEXT_PUBLIC_APP_URL.'
    });
  }
  if (env.AUTH_SECRET.includes('replace-with')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AUTH_SECRET'],
      message: 'Production AUTH_SECRET cannot use a placeholder value.'
    });
  }
  if (env.INTERNAL_JOB_TOKEN.length < 32 || env.INTERNAL_JOB_TOKEN.includes('replace-with')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['INTERNAL_JOB_TOKEN'],
      message: 'Production INTERNAL_JOB_TOKEN must be a non-placeholder secret of at least 32 characters.'
    });
  }
  if (!env.METRICS_TOKEN || env.METRICS_TOKEN.length < 32 || env.METRICS_TOKEN.includes('replace-with')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['METRICS_TOKEN'],
      message: 'Production METRICS_TOKEN must be a non-placeholder secret of at least 32 characters.'
    });
  }
  if (env.AI_PROVIDER === 'mock') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AI_PROVIDER'],
      message: 'Production APP_ENV cannot use the mock AI provider.'
    });
  }
  if (env.JOB_BACKEND !== 'temporal') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JOB_BACKEND'],
      message: 'Production APP_ENV must use Temporal for durable workflow orchestration.'
    });
  }
  if (!env.TEMPORAL_ADDRESS || !env.TEMPORAL_NAMESPACE || !env.TEMPORAL_TASK_QUEUE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TEMPORAL_ADDRESS'],
      message: 'Production Temporal requires TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, and TEMPORAL_TASK_QUEUE.'
    });
  }
  if (!env.KEYVAL_CACHE_ENABLED) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['KEYVAL_CACHE_ENABLED'],
      message: 'Production APP_ENV must keep key-value AI/RAG cache enabled.'
    });
  }
  if (env.STORAGE_DRIVER === 'local') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_DRIVER'],
      message: 'Production APP_ENV must use private object storage, not local filesystem storage.'
    });
  }
  if (env.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Production S3 storage requires ${key}.`
        });
      }
    }
  }
  if (env.MALWARE_SCANNING_MODE !== 'clamd') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MALWARE_SCANNING_MODE'],
      message: 'Production APP_ENV requires malware scanning through clamd.'
    });
  }
  if (env.OCR_PROVIDER !== 'external') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OCR_PROVIDER'],
      message: 'Production APP_ENV requires an external OCR/vision provider.'
    });
  }
  if (env.OCR_PROVIDER === 'external' && (!env.OCR_ENDPOINT || !env.OCR_API_KEY)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OCR_ENDPOINT'],
      message: 'External OCR requires OCR_ENDPOINT and OCR_API_KEY.'
    });
  }
  if (!env.DOCUMENT_ENCRYPTION_KEY_BASE64) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DOCUMENT_ENCRYPTION_KEY_BASE64'],
      message: 'Production APP_ENV requires document encryption at rest.'
    });
  }
  if (env.REVIEW_ASSIGNMENT_REQUIRED === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REVIEW_ASSIGNMENT_REQUIRED'],
      message: 'Production APP_ENV must enforce reviewer assignment checks.'
    });
  }
});

export const env = envSchema.parse(process.env);
