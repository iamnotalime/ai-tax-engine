import { UPLOAD_LIMITS } from '@/lib/constants';
import { AppError } from '@/lib/errors';

export function maxDocumentsForPackage(packageCode?: string | null) {
  return (packageCode ?? 'free_ai_scan') === 'free_ai_scan' ? UPLOAD_LIMITS.maxFilesFreeScan : UPLOAD_LIMITS.maxFilesPaidCase;
}

export function assertDocumentUploadLimit(params: {
  packageCode?: string | null;
  existingDocumentCount: number;
  attemptedUploadCount: number;
}) {
  const maxFiles = maxDocumentsForPackage(params.packageCode);
  if (params.existingDocumentCount + params.attemptedUploadCount <= maxFiles) return;

  throw new AppError('TOO_MANY_FILES', `Jumlah file melebihi batas paket (${maxFiles} file).`, 413, {
    existingDocumentCount: params.existingDocumentCount,
    attemptedUploadCount: params.attemptedUploadCount,
    maxFiles
  });
}
