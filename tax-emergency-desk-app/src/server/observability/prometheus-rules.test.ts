import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const requiredAlerts = [
  'TaxDeskAiProviderTimeout',
  'TaxDeskAiSchemaValidationFailure',
  'TaxDeskAiSupportCheckFailure',
  'TaxDeskRateLimitSpike',
  'TaxDeskPrivacyDeletionFailure',
  'TaxDeskPrivacyDeletionStalled',
  'TaxDeskRetentionSweepFailure',
  'TaxDeskRetentionNotRunning',
  'TaxDeskBackupStale'
];

describe('prometheus alert contract', () => {
  it('keeps production hardening alerts configured', () => {
    const rules = readFileSync(path.join(process.cwd(), 'monitoring', 'prometheus-rules.yml'), 'utf8');
    for (const alert of requiredAlerts) {
      assert.match(rules, new RegExp(`alert:\\s+${alert}`));
    }
  });
});
