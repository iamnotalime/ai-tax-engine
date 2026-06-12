import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import type { Case } from '@/server/db/types';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireUser();
    const { caseId } = await ctx.params;
    const [kase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, kase);
    const deliverables = await sql<Array<Record<string, unknown> & { versions: Record<string, unknown>[] }>>`
      select
        d.*,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', v.id,
              'versionNumber', v.version_number,
              'contentMarkdown', v.content_markdown,
              'contentHtml', v.content_html,
              'storageKey', v.storage_key,
              'createdAt', v.created_at
            )
            order by v.version_number desc
          ) filter (where v.id is not null),
          '[]'::jsonb
        ) as versions
      from deliverables d
      left join deliverable_versions v on v.deliverable_id = d.id
      where d.case_id = ${caseId}
      group by d.id
      order by d.created_at desc
    `;
    return Response.json({ deliverables });
  } catch (error) {
    return toErrorResponse(error);
  }
}
