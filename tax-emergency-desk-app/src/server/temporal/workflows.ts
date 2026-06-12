import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

export type TaxTriageWorkflowInput = {
  caseId: string;
  tenantId: string;
  requestedByUserId?: string;
};

const { runTaxTriageActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    maximumAttempts: 3
  }
});

export async function taxTriageWorkflow(input: TaxTriageWorkflowInput) {
  return runTaxTriageActivity(input);
}
