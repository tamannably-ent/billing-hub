// app/dashboard/page.tsx
import React from 'react';
import { PrismaClient } from '@prisma/client';
import DashboardClient from '@/components/DashboardClient1';
import { prisma } from '@/lib/prisma';
// const prisma = new PrismaClient();


// This forces Next.js to fetch fresh database values on every page load instead of caching static html outputs
// export const dynamic = 'force-dynamic';

async function fetchDatabaseBillingLogs() {
  try {
    // 1. Pull down data records straight from your MongoDB Atlas database deployment
    const subscribers = await prisma.subscriber.findMany();

    // 2. Flatten out nested billing array segments to feed them neatly into standard rows
    const plainTableRows = subscribers.flatMap((sub) => 
      (sub.billingRecords || []).map((rec) => ({
        month: rec.commissionMonth,
        account: sub.billingAccountNum,
        phone: sub.telephoneNum,
        bbId: sub.bbUserId,
        status: sub.serviceType === 'FTTH' ? 'ACTIVE' : 'ONE-WAY BLOCK', // Maps custom demographic rules dynamically
        invoice: rec.totalInvoiceAmount,
        share: rec.revenueShareAmtGenerated || 0,
      }))
    );

    return plainTableRows;
  } catch (error) {
    console.error('Failed to read tracking rows from MongoDB Atlas:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const dbRecords = await fetchDatabaseBillingLogs();

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Telecom Revenue & Operational Hub</h1>
        <p className="text-gray-500">Live operational data directly streaming from MongoDB Atlas cloud cluster.</p>
      </header>

      {/* Render layout component passing down initial database array logs */}
      <DashboardClient initialData={dbRecords} />
    </div>
  );
}
