import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertValidStatusTransition } from './status';

describe('case status transitions', () => {
  it('allows configured transition', () => {
    assert.doesNotThrow(() => assertValidStatusTransition('docs_uploaded', 'ai_triage_queued'));
  });

  it('rejects invalid transition', () => {
    assert.throws(() => assertValidStatusTransition('draft', 'delivered'), /tidak dapat/);
  });
});
