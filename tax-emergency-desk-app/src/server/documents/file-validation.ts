import { AppError } from '@/lib/errors';

const PDF = Buffer.from('%PDF-');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWith(buffer: Buffer, signature: Buffer) {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

function isWebp(buffer: Buffer) {
  return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

function isTextLike(buffer: Buffer) {
  return !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0);
}

export function assertValidFileSignature(buffer: Buffer, mimeType: string, filename: string) {
  const lowerName = filename.toLowerCase();
  const valid =
    (mimeType === 'application/pdf' && startsWith(buffer, PDF)) ||
    (mimeType === 'image/png' && startsWith(buffer, PNG)) ||
    (mimeType === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === 'image/webp' && isWebp(buffer)) ||
    ((mimeType.startsWith('text/') || lowerName.endsWith('.xml') || lowerName.endsWith('.csv')) && isTextLike(buffer)) ||
    (mimeType === 'application/xml' && isTextLike(buffer));

  if (!valid) {
    throw new AppError('FILE_SIGNATURE_MISMATCH', 'Isi file tidak sesuai dengan tipe file yang dikirim.', 415);
  }
}
