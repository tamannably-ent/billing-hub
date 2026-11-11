// app/register/page.tsx
'use client';

import React, { useState } from 'react';
import { registerAdminUser } from '@/app/actions/register';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerAdminUser(formData);

    if (result.success) {
      setFeedback({ 
        type: 'success', 
        text: '🎉 Account provisioned successfully! Redirecting...' 
      });
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setFeedback({ type: 'error', text: result.error || 'Failed to complete transaction.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 antialiased font-sans select-none">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Request Portal Access</h1>
          <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
            New Accounts Require Existing Admin Approval
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3 text-xs font-bold rounded-lg border whitespace-pre-line leading-relaxed ${
              feedback.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Enter your name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Official Email
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="user@telecom.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="Create a secure password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting Registration...' : 'Register Account'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 font-medium">
          Already approved?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
