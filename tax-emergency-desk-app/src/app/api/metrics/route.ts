import { env } from '@/config/env';
import { renderPrometheusMetrics } from '@/server/observability/metrics';

function authorized(req: Request) {
  const authorization = req.headers.get('authorization');
  if (env.METRICS_TOKEN && authorization === `Bearer ${env.METRICS_TOKEN}`) return true;
  if (env.APP_ENV !== 'production' && req.headers.get('x-internal-job-token') === env.INTERNAL_JOB_TOKEN) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response('Forbidden\n', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  return new Response(await renderPrometheusMetrics(), {
    headers: {
      'content-type': 'text/plain; version=0.0.4; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
