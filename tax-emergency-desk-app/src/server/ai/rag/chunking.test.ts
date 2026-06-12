import { describe, expect, it } from 'vitest';
import { chunkText } from './chunking';

describe('chunkText', () => {
  it('chunks with overlap', () => {
    const text = 'a'.repeat(4500);
    const chunks = chunkText(text, 1000, 100);
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks[0]).toHaveLength(1000);
  });
});
