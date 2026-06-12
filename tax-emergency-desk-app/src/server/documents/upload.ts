import { env } from '@/config/env';
import { sha256 } from '@/lib/crypto';
import { jsonb, sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { CaseStatus, DocumentStatus, type DocumentRow } from '@/server/db/types';
import { transitionCaseStatus } from '@/server/cases/service';
import { encryptDocumentBuffer } from './encryption';
import { assertValidFileSignature } from './file-validation';
import { extractTextFromBuffer } from './text-extraction';
import { assertCleanFile } from '@/server/security/malware';
import { getStorageAdapter } from '@/server/storage';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/xml',
  'text/xml'
]);

export async function storeCaseDocument(params: {
  caseId: string;
  uploadedByUserId: string;
  file: File;
  fromStatus: CaseStatus;
}) {
  if (!ALLOWED_MIME.has(params.file.type)) throw new AppError('UNSUPPORTED_FILE_TYPE', `Tipe file tidak didukung: ${params.file.type}`, 415);
  if (params.file.size > env.MAX_UPLOAD_BYTES) throw new AppError('FILE_TOO_LARGE', 'Ukuran file melebihi batas.', 413);

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  assertValidFileSignature(buffer, params.file.type, params.file.name);
  await assertCleanFile(buffer);
  const hash = sha256(buffer);
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `${params.caseId}/${Date.now()}-${hash.slice(0, 12)}-${safeName}`;

  const extracted = await extractTextFromBuffer(buffer, params.file.type, params.file.name);
  const stored = encryptDocumentBuffer(buffer);
  await getStorageAdapter().putObject({
    key: storageKey,
    buffer: stored.buffer,
    contentType: 'application/octet-stream',
    metadata: {
      originalMimeType: params.file.type,
      sha256: hash
    }
  });

  return sql.begin(async (tx) => {
    const [document] = await tx<DocumentRow[]>`
      insert into documents (
        case_id,
        uploaded_by_user_id,
        original_filename,
        storage_bucket,
        storage_key,
        mime_type,
        file_size_bytes,
        sha256_hash,
        page_count,
        status,
        metadata
      )
      values (
        ${params.caseId},
        ${params.uploadedByUserId},
        ${params.file.name},
        ${env.STORAGE_DRIVER},
        ${storageKey},
        ${params.file.type},
        ${params.file.size},
        ${hash},
        ${extracted.pageCount},
        ${extracted.confidence >= 0.5 ? DocumentStatus.ocr_done : DocumentStatus.ocr_pending},
        ${jsonb({ storage: stored.metadata })}
      )
      returning *
    `;
    await tx`
      insert into document_pages (document_id, page_number, text, ocr_confidence)
      values (${document.id}, 1, ${extracted.text}, ${extracted.confidence})
    `;
    await transitionCaseStatus(tx, {
      caseId: params.caseId,
      fromStatus: params.fromStatus,
      toStatus: CaseStatus.docs_uploaded,
      actorUserId: params.uploadedByUserId,
      eventType: 'document.uploaded',
      payload: { documentId: document.id }
    });
    return document;
  });
}
