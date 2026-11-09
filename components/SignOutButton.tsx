// components/SignOutButton.tsx (Or drop directly into your app/dashboard/layout.tsx header row area)
'use client';
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
    >
      🔒 Secure Logout
    </button>
  );
}
