const GUARANTEE_PATTERNS = [/pasti\s+(beres|aman|diterima|selesai)/i, /jamin(an|)\s+(diterima|aman|beres)/i, /100%\s+(aman|diterima|beres)/i];
const FABRICATION_PATTERNS = [/buat(kan)?\s+(invoice|faktur|bukti)\s+palsu/i, /ubah\s+(tanggal|nominal|npwp|faktur)/i, /sembunyikan\s+(omzet|penghasilan|transaksi)/i, /hapus\s+(bukti|transaksi)/i];

export function detectUnsafeUserIntent(text: string) {
  const reasons: string[] = [];
  for (const pattern of FABRICATION_PATTERNS) if (pattern.test(text)) reasons.push('fabrication_or_misrepresentation_request');
  return { unsafe: reasons.length > 0, reasons };
}

export function detectRiskyOutputLanguage(text: string) {
  const risky = GUARANTEE_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  return { risky: risky.length > 0, patterns: risky };
}

export function assertNoGuaranteeLanguage(text: string) {
  const result = detectRiskyOutputLanguage(text);
  if (result.risky) {
    throw new Error(`Risky guarantee language detected: ${result.patterns.join(', ')}`);
  }
}
