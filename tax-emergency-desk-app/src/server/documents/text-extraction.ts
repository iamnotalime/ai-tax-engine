import { extractWithOcrProvider } from './ocr';

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string, filename: string): Promise<{ text: string; confidence: number; pageCount: number }> {
  if (mimeType.startsWith('text/') || filename.endsWith('.xml') || filename.endsWith('.csv')) {
    return { text: buffer.toString('utf8').slice(0, 200_000), confidence: 0.95, pageCount: 1 };
  }
  return extractWithOcrProvider(buffer, mimeType, filename);
}
