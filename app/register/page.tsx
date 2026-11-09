// app/register/page.tsx
'use client';

import React, { useState } from 'react';
import { registerAdminUser } from '@/app/actions/register';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerAdminUser(formData);

    if (result.success) {
      setFeedback({ type: 'success', text: '🎉 Account provisioned successfully! Redirecting...' });
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
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Provision Admin Account</h1>
          <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Establish System Management Credentials</p>
        </div>

        {feedback && (
          <div className={`p-3 text-xs font-bold rounded-lg border whitespace-pre-line ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Harish Admin"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Official Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="harish@telecom.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Account Security Keyphrase</label>
            <input
              type="password"
              name="password"
              required
              placeholder="Create secure keyphrase"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50"
          >
            {loading ? 'Compiling Security Vectors...' : 'Compile Administrative Role'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 font-medium">
          Already registered?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
