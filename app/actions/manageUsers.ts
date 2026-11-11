// app/actions/manageUsers.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: 'ADMIN' | 'USER') {
  const session = await getServerSession(authOptions);

  // Security check: Only existing ADMINs can promote or demote users
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized action.' };
  }

   // 2. Fetch target user to check if they are the permanent Super Admin
   const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found.' };
  }

  // 3. Hard block against revoking or modifying the permanent Super Admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (superAdminEmail && targetUser.email?.toLowerCase() === superAdminEmail) {
    return {
      success: false,
      error: 'Action blocked: The Permanent Super Admin cannot be revoked or modified.',
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath('/dashboard/users');
  return { success: true };
}
