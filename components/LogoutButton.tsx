// components/SignOutButton.tsx
'use client';

import React from 'react';
import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  const handleLogout = async () => {
    // Triggers the session termination sequence and routes the browser back to the login page
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-slate-300 border border-slate-800 shadow-sm transition-all hover:bg-slate-800 hover:text-white active:scale-95 group"
    >
      <svg 
        className="h-3.5 w-3.5 text-slate-500 group-hover:text-red-400 transition-colors" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2.5" 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
        />
      </svg>
      <span>Secure Sign Out</span>
    </button>
  );
}
