import { PACKAGES, FREE_SCAN_DISCLAIMER, REVIEWED_PACK_DISCLAIMER } from '@/lib/constants';
import { env } from '@/config/env';

export async function GET() {
  return Response.json({
    packages: PACKAGES,
    disclaimers: { freeScan: FREE_SCAN_DISCLAIMER, reviewedPack: REVIEWED_PACK_DISCLAIMER },
    uploadLimits: { maxBytes: env.MAX_UPLOAD_BYTES }
  });
}
