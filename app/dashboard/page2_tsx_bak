// app/dashboard/page.tsx
import React, { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient1';
import { formatToShortDate } from '@/lib/utils';

// export const revalidate = 0;

// 1. Create a dedicated asynchronous sub-component that handles the data lookup
async function DashboardDataWrapper() {
  const subscribers = await prisma.subscriber.findMany();
  const dbRecords = subscribers.flatMap((sub) => 
    (sub.billingRecords || []).map((rec) => ({
      month: rec.commissionMonth,
      account: sub.billingAccountNum,
      phone: sub.telephoneNum,
      bbId: sub.bbUserId,
      serviceStartDate: formatToShortDate(sub.serviceStartDate),
      status: sub.serviceType === 'FTTH' ? 'ACTIVE' : 'ONE-WAY BLOCK',
      invoice: rec.totalInvoiceAmount,
      share: rec.revenueShareAmtGenerated || 0,
    }))
  );

  return <DashboardClient initialData={dbRecords} />;
}

// 2. Keep the main page clean and wrap the data component in Suspense
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Telecom Revenue Hub</h1>
      </header>

      {/* 🛠️ Suspense captures the dynamic async database call perfectly */}
      <Suspense fallback={
        <div className="p-6 text-center text-sm font-medium text-gray-500 animate-pulse bg-white rounded-xl border">
          Connecting to MongoDB Atlas and streaming billing records...
        </div>
      }>
        <DashboardDataWrapper />
      </Suspense>
    </div>
  );
}
