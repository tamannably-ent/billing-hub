// app/dashboard/users/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { updateUserRole } from '@/app/actions/manageUsers';

// export const revalidate = 0;
export const instant = false;

export default async function UserApprovalsPage() {
  const users = await prisma.user.findMany({
    orderBy: { role: 'desc' }, // Shows USER (pending) alongside ADMIN accounts
  });

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Admin Access Approvals</h1>
        <p className="text-xs text-gray-500 mt-1">
          Approve newly registered users to grant them access to the Revenue Share Dashboard.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase border-b">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Current Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => {
              const isPermanentAdmin = Boolean(superAdminEmail) && user.email?.toLowerCase() === superAdminEmail;
                
              const isApprovedAdmin = user.role === 'ADMIN';

              return (
                <tr
                  key={user.id}
                  className={isPermanentAdmin ? 'bg-blue-50/40' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {user.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    {isPermanentAdmin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        🛡️ Permanent Super Admin
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isApprovedAdmin
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isApprovedAdmin ? '✓ Approved Admin' : '⏳ Pending Approval (USER)'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isPermanentAdmin ? (
                      <span className="text-xs font-bold text-slate-400 select-none">
                        🔒 Protected Account
                      </span>
                    ) : (
                      <form
                        action={async () => {
                          'use server';
                          await updateUserRole(user.id, isApprovedAdmin ? 'USER' : 'ADMIN');
                        }}
                      >
                        <button
                          type="submit"
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isApprovedAdmin
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          }`}
                        >
                          {isApprovedAdmin ? 'Revoke Admin' : 'Approve as Admin'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
