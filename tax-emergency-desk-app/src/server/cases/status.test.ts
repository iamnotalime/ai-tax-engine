import { describe, expect, it } from 'vitest';
import { assertValidStatusTransition } from './status';

describe('case status transitions', () => {
  it('allows configured transition', () => {
    expect(() => assertValidStatusTransition('docs_uploaded', 'ai_triage_queued')).not.toThrow();
  });

  it('rejects invalid transition', () => {
    expect(() => assertValidStatusTransition('draft', 'delivered')).toThrow(/tidak dapat/);
  });
});
