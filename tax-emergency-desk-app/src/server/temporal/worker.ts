import { fileURLToPath } from 'node:url';
import { NativeConnection, Worker } from '@temporalio/worker';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import * as activities from './activities';

async function main() {
  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
    tls: env.TEMPORAL_TLS_ENABLED ? true : false
  });
  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: fileURLToPath(new URL('./workflows.ts', import.meta.url)),
    activities
  });
  logger.info({ taskQueue: env.TEMPORAL_TASK_QUEUE, namespace: env.TEMPORAL_NAMESPACE }, 'temporal worker started');
  await worker.run();
}

main().catch((error) => {
  logger.fatal({ error }, 'temporal worker crashed');
  process.exit(1);
});
