import { prisma } from '@/lib/db';
import type { Session } from 'next-auth';

export async function getAgentContext(session: Session | null) {
  if (!session?.user?.id) return null;
  const agencyUser = await prisma.agencyUser.findUnique({
    where: { userId: session.user.id },
    include: {
      agency: true,
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  if (!agencyUser || !agencyUser.agency.isActive) return null;
  return {
    userId: agencyUser.userId,
    agencyId: agencyUser.agencyId,
    agencyRole: agencyUser.role,
    agency: agencyUser.agency,
    tenantId: agencyUser.agency.tenantId,
  };
}
