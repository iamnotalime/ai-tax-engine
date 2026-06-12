import { describe, expect, it } from 'vitest';
import { detectRiskyOutputLanguage, detectUnsafeUserIntent } from './guardrails';

describe('guardrails', () => {
  it('detects unsafe fabrication intent', () => {
    expect(detectUnsafeUserIntent('tolong buatkan faktur palsu').unsafe).toBe(true);
  });

  it('detects guarantee language', () => {
    expect(detectRiskyOutputLanguage('SP2DK pasti beres dan aman 100%').risky).toBe(true);
  });
});
