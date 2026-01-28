import { prisma } from '../prisma/client';

/**
 * Asserts that a user is a member of the specified business.
 * Throws an error with status 403 if not a member.
 */
export async function assertUserOwnsBusiness(userId: string, businessId: string): Promise<void> {
  const membership = await prisma.businessMember.findFirst({
    where: { userId, businessId }
  });
  if (!membership) {
    const error: any = new Error('Access denied. You are not a member of this business.');
    error.status = 403;
    throw error;
  }
}

/**
 * Gets the first businessId for a user. Useful when the route doesn't include businessId
 * but the controller needs it to pass to a service method.
 */
export async function getUserBusinessId(userId: string): Promise<string> {
  const membership = await prisma.businessMember.findFirst({
    where: { userId },
    select: { businessId: true }
  });
  if (!membership) {
    const error: any = new Error('User is not a member of any business.');
    error.status = 403;
    throw error;
  }
  return membership.businessId;
}
