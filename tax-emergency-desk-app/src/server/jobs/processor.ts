import { z } from 'zod';
import { runTaxTriageWorkflow } from '@/server/ai/workflow';
import { processDataDeletionRequest } from '@/server/privacy/data-subject';
import { runRetentionSweep } from '@/server/privacy/retention';

const triagePayloadSchema = z.object({ caseId: z.string().uuid(), tenantId: z.string().uuid().optional() });
const dataDeletionPayloadSchema = z.object({ requestId: z.string().uuid() });
const retentionSweepPayloadSchema = z.object({ tenantId: z.string().uuid().optional() });

export async function processJob(jobType: string, payload: unknown) {
  if (jobType === 'tax_triage') {
    const parsed = triagePayloadSchema.parse(payload);
    return runTaxTriageWorkflow(parsed.caseId, parsed.tenantId);
  }
  if (jobType === 'data_deletion') {
    const parsed = dataDeletionPayloadSchema.parse(payload);
    return processDataDeletionRequest(parsed.requestId);
  }
  if (jobType === 'retention_sweep') {
    const parsed = retentionSweepPayloadSchema.parse(payload);
    return runRetentionSweep(parsed.tenantId);
  }
  throw new Error(`Unknown job type: ${jobType}`);
}
