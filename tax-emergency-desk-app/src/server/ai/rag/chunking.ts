export function chunkText(text: string, maxChars = 1800, overlapChars = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + maxChars);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks;
}
