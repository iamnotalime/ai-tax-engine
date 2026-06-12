import { describe, expect, it } from 'vitest';
import { assertValidFileSignature } from './file-validation';

describe('assertValidFileSignature', () => {
  it('accepts matching PDF signatures', () => {
    expect(() => assertValidFileSignature(Buffer.from('%PDF-1.7'), 'application/pdf', 'letter.pdf')).not.toThrow();
  });

  it('rejects spreadsheet payloads', () => {
    const zipSpreadsheetSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(() =>
      assertValidFileSignature(zipSpreadsheetSignature, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'report.xlsx')
    ).toThrow('Isi file tidak sesuai');
  });
});
