import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectRiskyOutputLanguage, detectUnsafeUserIntent } from './guardrails';

describe('guardrails', () => {
  it('detects unsafe fabrication intent', () => {
    assert.equal(detectUnsafeUserIntent('tolong buatkan faktur palsu').unsafe, true);
  });

  it('detects guarantee language', () => {
    assert.equal(detectRiskyOutputLanguage('SP2DK pasti beres dan aman 100%').risky, true);
  });
});
