// app/dashboard/page.tsx
import React, { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient2';

// export const revalidate = 0;
export const instant = false;

function formatToShortDate(dateInput: any): string {
  if (!dateInput) return '-';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

async function loadSegregatedLogs() {
  try {
    const [ftthCollection, leasedLineCollection] = await Promise.all([
      prisma.subscriber.findMany(),
      prisma.leasedLine.findMany()
    ]);

    const ftthInitial = ftthCollection.flatMap(sub => 
      (sub.billingRecords || []).map(rec => ({
        month: rec.commissionMonth,
        account: sub.billingAccountNum,
        phone: sub.telephoneNum,
        bbId: sub.bbUserId,
        serviceStartDate: formatToShortDate(sub.serviceStartDate),
        invoice: rec.totalInvoiceAmount,
        share: rec.revenueShareAmtGenerated || 0
      }))
    );

    const llInitial = leasedLineCollection.flatMap(ll => 
      (ll.billingRecords || []).map(rec => ({
        month: rec.commissionMonth,
        account: ll.billingAccountNum,
        phone: ll.lcId,
        bbId: ll.lcId, // Maps Circuit LC ID horizontally
        serviceStartDate: formatToShortDate(ll.serviceStartDate),
        invoice: rec.totalInvoiceAmount,
        share: rec.revenueShareAmtGenerated || 0,
        // to display end of the lc like END_A or END_B
        remarks: rec.remarks || ''
      }))
    );

    console.log(llInitial);
    return { ftthInitial, llInitial };
  } catch (err) {
    console.error('Server extraction broke:', err);
    return { ftthInitial: [], llInitial: [] };
  }
}

export default async function DashboardPage() {
  const { ftthInitial, llInitial } = await loadSegregatedLogs();

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 font-sans">
      <header className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Revenue Share Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Isolated database tab ledgers powered by MongoDB Atlas connection pools.</p>
      </header>

      <Suspense fallback={<div className="p-10 text-center animate-pulse text-gray-400">Loading isolated ledger contexts...</div>}>
        <DashboardClient ftthInitial={ftthInitial} llInitial={llInitial} />
      </Suspense>
    </div>
  );
}
