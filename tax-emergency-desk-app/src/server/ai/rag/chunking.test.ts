import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkText } from './chunking';

describe('chunkText', () => {
  it('chunks with overlap', () => {
    const text = 'a'.repeat(4500);
    const chunks = chunkText(text, 1000, 100);
    assert.ok(chunks.length > 4);
    assert.equal(chunks[0].length, 1000);
  });
});
