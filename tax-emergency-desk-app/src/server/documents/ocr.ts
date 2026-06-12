import { z } from 'zod';
import { env } from '@/config/env';
import { AppError } from '@/lib/errors';

const ocrResponseSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  pageCount: z.number().int().positive().default(1)
});

export type OcrResult = z.infer<typeof ocrResponseSchema>;

async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new AppError('OCR_TIMEOUT', 'OCR provider timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractWithOcrProvider(buffer: Buffer, mimeType: string, filename: string): Promise<OcrResult> {
  if (env.OCR_PROVIDER === 'manual') {
    return {
      text: `[OCR_REQUIRED] File ${filename} (${mimeType}) telah diunggah, tetapi ekstraksi teks membutuhkan provider OCR produksi atau input teks manual.`,
      confidence: 0.25,
      pageCount: 1
    };
  }
  if (!env.OCR_ENDPOINT || !env.OCR_API_KEY) throw new AppError('OCR_NOT_CONFIGURED', 'OCR provider is not configured.', 500);

  const payload = {
    filename,
    mimeType,
    contentBase64: buffer.toString('base64')
  };
  const response = await withTimeout(env.OCR_TIMEOUT_MS, (signal) =>
    fetch(env.OCR_ENDPOINT!, {
      method: 'POST',
      signal,
      headers: {
        authorization: `Bearer ${env.OCR_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  );
  if (!response.ok) throw new AppError('OCR_PROVIDER_ERROR', `OCR provider failed with status ${response.status}.`, 502);
  const parsed = ocrResponseSchema.parse(await response.json());
  return {
    text: parsed.text.slice(0, 200_000),
    confidence: parsed.confidence,
    pageCount: parsed.pageCount
  };
}
