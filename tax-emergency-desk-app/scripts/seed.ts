import postgres from 'postgres';
import { normalizePostgresUrl } from '../src/lib/postgres-url';
import { hashPassword } from '../src/server/auth/password';
import type { UserRole } from '../src/server/db/types';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const database = normalizePostgresUrl(databaseUrl);
const sql = postgres(database.url, { connection: database.connection, transform: postgres.camel });

type SeedUser = { id: string; role: UserRole };

async function upsertUser(email: string, role: UserRole, fullName: string): Promise<SeedUser> {
  const passwordHash = await hashPassword('ChangeMe123!');
  const [user] = await sql<Array<{ id: string; role: UserRole }>>`
    insert into app_users (email, role, full_name, password_hash)
    values (${email}, ${role}, ${fullName}, ${passwordHash})
    on conflict (email) do update set
      role = excluded.role,
      full_name = excluded.full_name,
      password_hash = excluded.password_hash,
      updated_at = now()
    returning id
  `;
  return user;
}

function membershipRole(role: UserRole) {
  if (role === 'admin') return 'owner';
  if (role === 'ops' || role === 'support') return 'ops';
  if (role === 'tax_associate' || role === 'licensed_tax_consultant') return 'reviewer';
  return 'member';
}

async function upsertDemoTenant(users: SeedUser[]) {
  const [tenant] = await sql<Array<{ id: string }>>`
    insert into tenants (slug, name)
    values ('default', 'Default Workspace')
    on conflict (slug) do update set name = excluded.name, updated_at = now()
    returning id
  `;
  for (const user of users) {
    await sql`
      insert into tenant_memberships (tenant_id, user_id, role, is_default)
      values (${tenant.id}, ${user.id}, ${membershipRole(user.role)}, true)
      on conflict (tenant_id, user_id) do update set
        role = excluded.role,
        is_default = true,
        updated_at = now()
    `;
  }
}

async function main() {
  const reviewer = await upsertUser('reviewer@example.com', 'licensed_tax_consultant', 'Senior Tax Reviewer');
  const ops = await upsertUser('ops@example.com', 'ops', 'Ops Analyst');
  const demoUser = await upsertUser('user@example.com', 'user', 'Demo User');
  await upsertDemoTenant([reviewer, ops, demoUser]);

  await sql`
    insert into reviewer_profiles (
      user_id,
      reviewer_type,
      license_number,
      sikop_status,
      specialties
    )
    values (${reviewer.id}, 'licensed_tax_consultant', 'DEMO-SIKOP-001', 'demo_unverified', ${['SP2DK', 'PPN', 'Coretax']})
    on conflict (user_id) do update set
      reviewer_type = excluded.reviewer_type,
      license_number = excluded.license_number,
      sikop_status = excluded.sikop_status,
      specialties = excluded.specialties,
      updated_at = now()
  `;

  const chunks = [
    {
      slug: 'sp2dk-positioning',
      title: 'SP2DK response workflow boundaries',
      text: 'SP2DK response packs should summarize visible facts, requested data, missing documents, and draft a factual response. Do not guarantee acceptance, do not compute deadlines without received date, and route uncertain cases to professional review.',
      sourceLabel: 'Internal product policy v1'
    },
    {
      slug: 'coretax-credentials-policy',
      title: 'Coretax credential policy',
      text: 'The product must not collect or store DJP/Coretax username, password, passphrase, or other credentials. Users upload screenshots, XML, CSV, faktur, and supporting documents themselves.',
      sourceLabel: 'Internal security policy v1'
    },
    {
      slug: 'evidence-matrix-standard',
      title: 'Evidence matrix standard',
      text: 'Every material statement in a draft response requires source references to uploaded documents. If documents are missing, mark the evidence item as missing or insufficient rather than inventing content.',
      sourceLabel: 'Internal reviewer SOP v1'
    }
  ];

  for (const chunk of chunks) {
    await sql`
      insert into knowledge_chunks (namespace, slug, version, title, text, source_label)
      values ('tax_id', ${chunk.slug}, 'v1', ${chunk.title}, ${chunk.text}, ${chunk.sourceLabel})
      on conflict (namespace, slug, version) do update set
        title = excluded.title,
        text = excluded.text,
        source_label = excluded.source_label
    `;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
