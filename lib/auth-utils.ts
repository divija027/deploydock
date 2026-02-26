import crypto from 'crypto';
import type { Session } from 'next-auth';

type Role = 'admin' | 'developer' | 'viewer';

const roleLevel: Record<Role, number> = {
  admin: 3,
  developer: 2,
  viewer: 1,
};

export function hasRole(session: Session | null, minRole: Role): boolean {
  if (!session?.user) return false;
  const userRole = (session.user as any).role as Role ?? 'viewer';
  return roleLevel[userRole] >= roleLevel[minRole];
}

export function verifyGitHubSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
