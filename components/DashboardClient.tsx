// components/DashboardClient.tsx
'use client';

import React, { useState, useMemo, useTransition } from 'react';
import ExcelUploadParser from '@/components/ExcelUploadParser';
import { deleteAllRecords, uploadReportData } from '@/app/actions/uploadReport';

interface FlattenedRecord {
  month: string;
  account: string;
  phone: string;
  bbId: string;
  status: string;
  invoice: number;
  share: number;
}

interface DashboardClientProps {
  initialData: FlattenedRecord[];
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [liveData, setLiveData] = useState<FlattenedRecord[]>(initialData);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition(); // Tracks execution state

  const handleClearAll = () => {
    if (!window.confirm('Are you absolutely sure you want to clear out the entire database? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAllRecords();
      if (result.success) {
        setLiveData([]); // Flush your active UI viewport state immediately
        setSyncMessage({ 
          type: 'success', 
          text: result.message || 'Database wiped successfully!'  
        });
      } else {
        setSyncMessage({ type: 'error', text: result.error });
      }
    });
  };

  // Triggered when a new Excel file is parsed in the browser
  const handleDataParsed = async (parsedData: any[]) => {
    setSyncMessage(null);
    
    // Optimistically update the UI table with the parsed spreadsheet rows instantly
    const dynamicRows: FlattenedRecord[] = parsedData.map(row => ({
      month: String(row['COMMISSION MONTH'] || ''),
      account: String(row['BILLING ACCC NUM'] || ''),
      phone: String(row['TELEPHONE NUM'] || ''),
      bbId: String(row['BB USER ID'] || ''),
      status: String(row['SERVICE STATUS'] || 'ACTIVE'),
      invoice: parseFloat(row['TOTAL INVOICE AMOUNT']) || 0,
      share: parseFloat(row['REVENUE SHARE AMT GENERATED']) || 0
    }));
    
    setLiveData(dynamicRows);

    // Save records to MongoDB Atlas via Server Action
    const result = await uploadReportData(parsedData);
    if (result.success) {
      setSyncMessage({ type: 'success', text: result.message || 'Database synced successfully!' });
    } else {
      setSyncMessage({ type: 'error', text: result.error || 'Failed to sync with MongoDB Atlas.' });
    }
  };

  // 1. Unified Search Filter across Telephone, Account, or Broadband User ID
  const filteredResults = useMemo(() => {
    return liveData.filter((row) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        row.phone.toLowerCase().includes(query) ||
        row.account.toLowerCase().includes(query) ||
        row.bbId.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, liveData]);

  // 2. Aggregate Month-Wise Revenue Share Sums dynamically
  const monthlySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredResults.forEach((row) => {
      summary[row.month] = (summary[row.month] || 0) + row.share;
    });
    return Object.entries(summary);
  }, [filteredResults]);

  return (
    <div className="space-y-6">
      {/* EXCEL IMPORT UPLOAD ZONE */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Latest Monthly Report Spreadsheet</h2>
        <ExcelUploadParser 
          onDataParsed={handleDataParsed}
          onUploadStart={() => setSyncMessage(null)}
          onUploadError={(err: any) => setSyncMessage({ type: 'error', text: err })}
        />
        {syncMessage && (
          <div className={`mt-3 p-3 text-sm rounded-lg border ${
            syncMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {syncMessage.text}
          </div>
        )}
      </section>

      {/* TOP SEARCH BAR */}
      <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Global Account Identity Search Lookup
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter Telephone Number (e.g., 08392-200951), Billing Account Number, or Broadband User ID..."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </section>

      {/* REVENUE SHARE MONTH-WISE SUMMARY */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {monthlySummary.map(([month, totalShare]) => (
          <div key={month} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">{month} Revenue Share</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-900">₹{totalShare.toLocaleString('en-IN')}</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700">Accumulated total generated share payout</p>
          </div>
        ))}
      </section>

      {/* BOTTOM FILTERED RESULTS TABLE */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Matching Billing Log Records ({filteredResults.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider text-xs border-b border-gray-200">
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3">Billing Account</th>
                <th className="px-6 py-3">Telephone Num</th>
                <th className="px-6 py-3">BB User ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Invoice Amt</th>
                <th className="px-6 py-3 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.length > 0 ? (
                filteredResults.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{row.month}</td>
                    <td className="px-6 py-4 font-mono">{row.account}</td>
                    <td className="px-6 py-4 font-mono">{row.phone}</td>
                    <td className="px-6 py-4">{row.bbId}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">₹{row.invoice.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">₹{row.share.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No records found in database collection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Data Management Panel</h2>
            <p className="text-xs text-gray-400">Import new spreadsheet files or purge active cluster logs.</p>
          </div>
          
          {/* PURGE BUTTON CONTROL */}
          <button
            onClick={handleClearAll}
            disabled={isPending || liveData.length === 0}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
              liveData.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50'
            }`}
          >
            {isPending ? 'Wiping Database...' : 'Delete All Uploaded Records'}
          </button>
        </div>

        <ExcelUploadParser 
          onDataParsed={async (parsedData) => {
            // ... Keep your upload report logic from earlier here ...
          }}
          onUploadStart={() => setSyncMessage(null)}
          onUploadError={(err) => setSyncMessage({ type: 'error', text: err })}
        />

        {syncMessage && (
          <div className={`mt-3 p-3 text-sm rounded-lg border ${
            syncMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {syncMessage.text}
          </div>
        )}
      </section>
    </div>
  );
}
