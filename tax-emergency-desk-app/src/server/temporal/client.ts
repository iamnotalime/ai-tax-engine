import { Client, Connection } from '@temporalio/client';
import { env } from '@/config/env';

let clientPromise: Promise<Client> | null = null;

export async function getTemporalClient() {
  clientPromise ??= Connection.connect({
    address: env.TEMPORAL_ADDRESS,
    tls: env.TEMPORAL_TLS_ENABLED ? true : false
  }).then((connection) => new Client({ connection, namespace: env.TEMPORAL_NAMESPACE }));
  return clientPromise;
}
