// components/DatabaseMonitor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getDatabaseStorageStatus } from '@/app/actions/dbStats';

export default function DatabaseMonitor() {
  const [dbStorage, setDbStorage] = useState<{ usedMb: number; usagePercentage: number; isApproachingLimit: boolean } | null>(null);

  useEffect(() => {
    async function checkStorageFootprint() {
      // 🛠️ Dynamic Server Action execution import pass
    //   const { getDatabaseStorageStatus } = await import('@/app/actions/dbStats');
      const status = await getDatabaseStorageStatus();
      if (status.success) {
        setDbStorage({
          usedMb: status.usedMb,
          usagePercentage: status.usagePercentage,
          isApproachingLimit: status.isApproachingLimit
        });
      }
    }

    checkStorageFootprint();
    const interval = setInterval(checkStorageFootprint, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-400">
        <span>Database Storage</span>
        <span className="font-mono text-slate-200">
          {dbStorage ? `${dbStorage.usedMb} MB` : 'Calculating...'}
        </span>
      </div>

      {/* Dynamic Color-Shifting Progress Bar Matrix */}
      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50 flex">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            dbStorage && dbStorage.usagePercentage >= 80 
              ? 'bg-red-500 shadow-md shadow-red-500/20' 
              : dbStorage && dbStorage.usagePercentage >= 50 
              ? 'bg-amber-500' 
              : 'bg-blue-500'
          }`}
          style={{ width: `${dbStorage ? Math.max(dbStorage.usagePercentage, 2) : 0}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
        <span>0 MB</span>
        <span>Quota: 512 MB</span>
      </div>
    </div>
  );
}
