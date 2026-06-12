import { getSessionUser } from '@/server/auth/session';

export async function GET() {
  const user = await getSessionUser();
  return Response.json({ user: user ? { id: user.id, email: user.email, fullName: user.fullName, role: user.role } : null });
}
