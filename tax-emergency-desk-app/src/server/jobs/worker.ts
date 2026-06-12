import { logger } from '@/lib/logger';
import { claimNextJob, completeJob, failJob } from './queue';
import { processJob } from './processor';

const workerId = `worker-${process.pid}`;

async function tick() {
  const job = await claimNextJob(workerId);
  if (!job) return false;
  try {
    logger.info({ jobId: job.id, jobType: job.jobType }, 'processing job');
    await processJob(job.jobType, job.payload);
    await completeJob(job.id);
  } catch (error) {
    logger.error({ error, jobId: job.id }, 'job failed');
    await failJob(job.id, error);
  }
  return true;
}

async function main() {
  logger.info({ workerId }, 'worker started');
  for (;;) {
    const hadJob = await tick();
    if (!hadJob) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'worker crashed');
  process.exit(1);
});
