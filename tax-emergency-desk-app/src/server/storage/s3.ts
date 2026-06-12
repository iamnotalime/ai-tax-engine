import { createHash, createHmac } from 'node:crypto';
import { env } from '@/config/env';
import { AppError } from '@/lib/errors';
import type { StorageAdapter, StoredObjectInput } from './types';

type SignedRequest = {
  url: URL;
  headers: Record<string, string>;
};

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hash(value: Buffer<ArrayBufferLike> | string) {
  return createHash('sha256').update(value).digest('hex');
}

function amzDate(now = new Date()) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function requireS3Env() {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new AppError('STORAGE_NOT_CONFIGURED', 'S3 storage is not fully configured.', 500);
  }
  return {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  };
}

function objectUrl(bucket: string, key: string) {
  const encodedKey = encodeKey(key);
  if (env.S3_ENDPOINT) {
    const endpoint = new URL(env.S3_ENDPOINT);
    if (env.S3_FORCE_PATH_STYLE) {
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
      return endpoint;
    }
    endpoint.hostname = `${bucket}.${endpoint.hostname}`;
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/${encodedKey}`;
    return endpoint;
  }
  return new URL(`https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${encodedKey}`);
}

function signRequest(method: 'PUT' | 'DELETE', key: string, body: Buffer<ArrayBufferLike>, contentType?: string): SignedRequest {
  const { bucket, region, accessKeyId, secretAccessKey } = requireS3Env();
  const url = objectUrl(bucket, key);
  const payloadHash = hash(body);
  const timestamp = amzDate();
  const date = timestamp.slice(0, 8);
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp
  };
  if (contentType) headers['content-type'] = contentType;

  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join('');
  const signedHeaders = sortedHeaderNames.join(';');
  const canonicalRequest = [
    method,
    url.pathname,
    url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const credentialScope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, credentialScope, hash(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { url, headers };
}

async function sendSigned(method: 'PUT' | 'DELETE', key: string, body: Buffer<ArrayBufferLike> = Buffer.alloc(0), contentType?: string) {
  const signed = signRequest(method, key, body, contentType);
  const response = await fetch(signed.url, {
    method,
    headers: signed.headers,
    body: method === 'PUT' ? (body as unknown as BodyInit) : undefined
  });
  if (!response.ok) {
    throw new AppError('STORAGE_WRITE_FAILED', `S3 ${method} failed with status ${response.status}.`, 502);
  }
}

export class S3StorageAdapter implements StorageAdapter {
  readonly driver = 's3' as const;

  async putObject(input: StoredObjectInput) {
    await sendSigned('PUT', input.key, input.buffer, input.contentType);
  }

  async deleteObject(key: string) {
    await sendSigned('DELETE', key);
  }
}
