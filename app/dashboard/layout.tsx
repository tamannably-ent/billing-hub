// app/dashboard/layout.tsx (Part 1 - Sidebar & Application Scaffold)
import SignOutButton from '@/components/LogoutButton';
import React from 'react';
import Image from 'next/image';
import DatabaseMonitor from '@/components/DatabaseMonitor';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50/50 text-gray-900 font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* 🛠️ PERSISTENT APPLICATION VERTICAL NAVIGATION SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col border-r border-slate-800 shrink-0 sticky top-0 h-screen shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
        {/* Hub Header Brand Title */}
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/20">
          <Image src={'/images/logo_transparent.png'} alt='logo' width={40} height={40} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">THAMANNA</h2>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">BSNL Franchisee, BELLARY</span>
          </div>
        </div>

        {/* Navigation Core Menu Workspace Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Operational Core</span>
          
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white transition-all shadow-sm border border-slate-700/50">
            📊 Revenue Share Reports
          </a>
          <a href="/dashboard/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white transition-all shadow-sm border border-slate-700/50">
            👥 User Management
          </a>

          {/* 🛠️ INTEGRATION AREA 1: BOTTOM OF THE LEFT VERTICAL SIDEBAR MENU GRID PANEL */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-3">
          {/* <SignOutButton /> */}
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-medium text-[11px]">2FA Firewall Active</span>
          </div>
        </div>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors">
            🔧 Franchisee Ledger
          </a>

          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block pt-4 mb-2">Systems Infrastructure</span>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors">
            ⚡ Circuit Monitor
          </a>
        </nav>


        {/* Sidebar Footer System Footnotes Info Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs flex flex-col gap-1.5">

          <DatabaseMonitor />
          
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-medium">Node: Connected</span>
          </div>
          {/* <span className="text-[10px] text-slate-600 font-semibold">Production Build v1.4.2</span> */}

          <div className="p-2 border-t border-slate-900/60">
            <SignOutButton />
          </div>
        </div>
      </aside>
      {/* // app/dashboard/layout.tsx (Part 2 - Global Top Header & Viewport Container) */}
      
      {/* RIGHT WORKSPACE INTERFACE SHELL CANVAS CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        
        {/* GLOBAL TOP TOP BAR NAVIGATION PLATFORM */}
        <header className="h-16 bg-white border-b border-gray-200/80 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3 md:gap-0">
            {/* Mobile Hamburger Burger Drawer Indicator Menu icon (Hidden on Desktop viewports) */}
            <button className="p-1.5 rounded-lg border text-gray-500 md:hidden hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block text-xs font-semibold text-gray-400 tracking-wide uppercase">
              Operational Hub Portal Console Workspace
            </div>
          </div>

          {/* User Session Profile Settings Overlay Placement */}
          <div className="flex items-center gap-6">
            {/* 🛠️ INTEGRATION AREA 2: FAST ACTION SIGNOUT BUTTON IN THE TOP LOGGED-IN BANNER HEADER */}
            <div className="hidden lg:block">
              <SignOutButton />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-none">Administration</p>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5 inline-block">Hub Controller Admin</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-600 font-bold text-xs text-white flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-200">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* MAIN DYNAMIC CONTENT CONTAINER GRID (Loads your live Dashboard data files) */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
