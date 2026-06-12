const REDACTIONS: Array<[RegExp, string]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]'],
  [/\+?62[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,5}/g, '[REDACTED_PHONE]'],
  [/\b0\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,5}\b/g, '[REDACTED_PHONE]'],
  [/\b\d{2}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d[.\s-]?\d{3}[.\s-]?\d{3}\b/g, '[REDACTED_NPWP]'],
  [/\b\d{16}\b/g, '[REDACTED_NIK]']
];

export function redactSensitiveText(text: string) {
  return REDACTIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}
