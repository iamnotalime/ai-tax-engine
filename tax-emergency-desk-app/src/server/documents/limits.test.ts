import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '@/lib/errors';
import { assertDocumentUploadLimit, maxDocumentsForPackage } from './limits';

describe('document upload limits', () => {
  it('uses a lower document cap for free scans', () => {
    assert.equal(maxDocumentsForPackage('free_ai_scan'), 3);
    assert.equal(maxDocumentsForPackage(null), 3);
  });

  it('uses the paid-case document cap for reviewed packages', () => {
    assert.equal(maxDocumentsForPackage('reviewed_sp2dk_response_pack'), 30);
    assert.equal(maxDocumentsForPackage('coretax_error_resolution_pack'), 30);
  });

  it('rejects uploads that exceed the package document cap', () => {
    assert.throws(
      () =>
        assertDocumentUploadLimit({
          packageCode: 'free_ai_scan',
          existingDocumentCount: 2,
          attemptedUploadCount: 2
        }),
      (error) => error instanceof AppError && error.code === 'TOO_MANY_FILES' && error.status === 413
    );
  });
});
