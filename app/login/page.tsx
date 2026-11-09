// app/login/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { generateAndSend2FA } from '../actions/twoFactor';

// 🛠️ 1. Move your main component layout here
function LoginTerminal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  
  // 🛠️ 2FA STATE CONTROLLERS
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intercept unauthorized middleware routing parameters safely at runtime
  useEffect(() => {
    const errorType = searchParams.get('error');
    if (errorType === 'CredentialsSignin') {
      setErrorMessage('Invalid administrative email address or password combination.');
    } else if (errorType === 'Unauthorized') {
      setErrorMessage('🔒 Access Denied! You must be an authorized ADMIN to enter.');
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await signIn('credentials', {
        email,
        password,
        redirect: false,
        isTwoFactorPass: 'false',
      });

      if (response?.error) {
        setErrorMessage('Invalid administrative email address or password.');
        setLoading(false);
        return;
      }

      // If credentials check passes, send the 6-digit code
      const email2FA = await generateAndSend2FA(email);
      if (email2FA.success) {
        setShow2FAForm(true); // 🛠️ Instantly swaps input UI views on screen
      } else {
        setErrorMessage(email2FA.error || 'Failed to deliver security token email.');
      }

    } catch (err) {
      setErrorMessage('An unexpected network processing failure occurred.');
    } finally {
      setLoading(false);
    }
  };

   // PHASE 1: Handle password verification and fire off email code
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Pre-flight credentials verification
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        isTwoFactorPass: 'false' // Flags it as a pre-flight request
      });

      if (res?.error) {
        setErrorMessage('Invalid administrative email address or password.');
        setLoading(false);
        return;
      }

      // If credentials check passes, send the 6-digit code
      const email2FA = await generateAndSend2FA(email);
      if (email2FA.success) {
        setShow2FAForm(true); // 🛠️ Instantly swaps input UI views on screen
      } else {
        setErrorMessage(email2FA.error || 'Failed to deliver security token email.');
      }
    } catch (err) {
      setErrorMessage('An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };
  
    // PHASE 2: Verify the 6-digit token code and complete sign-in
    const handleVerificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMessage(null);
  
      try {
        const response = await signIn('credentials', {
          email,
          password,
          code,
          redirect: false,
          isTwoFactorPass: 'true' // Flags it to run full 2FA validation check
        });
  
        if (response?.error) {
          setErrorMessage('Invalid or expired security code.');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } catch (err) {
        setErrorMessage('Validation processing failure.');
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 antialiased font-sans select-none">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 space-y-6">
        
        {/* Hub Header Brand Title */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xl mx-auto shadow-md">
            🔒
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {show2FAForm ? 'Enter Verification Code' : 'Telecom Gateway Login'}
          </h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {show2FAForm ? `We sent a 6-digit security token to ${email}` : 'Two-Factor Secure Authentication Enabled'}
          </p>
        </div>

        {/* Real-time Validation Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* 🛠️ CONDITIONAL RENDERING ELEMENT BLOCKS WRAPPER */}
        {!show2FAForm ? (
          // FORM VIEW A: Standard Password Gateway
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Admin Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@telecom.com" className="w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Security Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? 'Verifying Credentials...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          // FORM VIEW B: 6-Digit 2FA Token Validation Form
          <form onSubmit={handleVerificationSubmit} className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 tracking-wider">6-Digit Email Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Restricts inputs to numeric digits only
                placeholder="123456"
                className="w-full text-center rounded-lg border border-gray-300 px-4 py-3 text-2xl font-black tracking-[8px] text-blue-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-200"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Confirming Token Security...' : 'Verify Code & Enter Dashboard'}
            </button>
            <button type="button" onClick={() => setShow2FAForm(false)} className="w-full text-center text-xs text-gray-500 font-semibold hover:underline">
              ← Back to Login Credentials
            </button>
          </form>
        )}

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <span className="relative px-3 bg-white text-xs text-gray-400 font-bold uppercase tracking-widest">OR</span>
        </div>

        {/* Google OAuth Provider */}
        <button
          onClick={() => { setLoading(true); signIn('google', { callbackUrl: '/dashboard' }); }}
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2.5"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 3.927 1.011 4.87 1.916l3.24-3.116C18.23 2.152 15.42 1 12.24 1 5.38 1 .23 6.052.23 12.29s5.15 11.29 12.01 11.29c7.17 0 11.96-5.03 11.96-12.16 0-.82-.09-1.43-.2-2.13H12.24z"/>
          </svg>
          Continue with Google Secure Auth
        </button>

        <div className="text-center text-xs text-gray-400 font-medium">
          New terminal controller?{' '}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            Register Admin Account
          </Link>
        </div>
      </div>
    </div>
  );
}

// 🛠️ 2. PRIMARY EXPORT: Safely wrap your terminal inside Suspense boundary rules
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center text-sm font-bold text-gray-400 animate-pulse shadow-2xl">
          Initialising Secure Gateway Terminal...
        </div>
      </div>
    }>
      <LoginTerminal />
    </Suspense>
  );
}
