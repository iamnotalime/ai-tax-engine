import { runTaxTriageWorkflow } from '@/server/ai/workflow';
import type { TaxTriageWorkflowInput } from './workflows';

export async function runTaxTriageActivity(input: TaxTriageWorkflowInput) {
  return runTaxTriageWorkflow(input.caseId, input.tenantId);
}
