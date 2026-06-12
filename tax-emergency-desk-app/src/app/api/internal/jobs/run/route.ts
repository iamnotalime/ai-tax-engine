import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { claimNextJob, completeJob, failJob } from '@/server/jobs/queue';
import { processJob } from '@/server/jobs/processor';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('x-internal-job-token') !== env.INTERNAL_JOB_TOKEN) throw new AppError('FORBIDDEN', 'Invalid job token.', 403);
    await assertRateLimit(req, RATE_LIMITS.internalJobRunner);
    const job = await claimNextJob('api-worker');
    if (!job) return Response.json({ processed: false });
    try {
      await processJob(job.jobType, job.payload);
      await completeJob(job.id);
      return Response.json({ processed: true, jobId: job.id });
    } catch (error) {
      await failJob(job.id, error);
      throw error;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
