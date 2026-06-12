import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertValidFileSignature } from './file-validation';

describe('assertValidFileSignature', () => {
  it('accepts matching PDF signatures', () => {
    assert.doesNotThrow(() => assertValidFileSignature(Buffer.from('%PDF-1.7'), 'application/pdf', 'letter.pdf'));
  });

  it('rejects spreadsheet payloads', () => {
    const zipSpreadsheetSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    assert.throws(
      () => assertValidFileSignature(zipSpreadsheetSignature, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'report.xlsx'),
      /Isi file tidak sesuai/
    );
  });
});
