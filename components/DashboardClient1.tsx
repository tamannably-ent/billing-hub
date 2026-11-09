// components/DashboardClient.tsx (Part 1 - Core Imports & Filters)
'use client';

import React, { useState, useMemo } from 'react';

import * as XLSX from 'xlsx';

import ExcelUploadParser from '@/components/ExcelUploadParser';
import { uploadReportData } from '@/app/actions/uploadReport1';
import { formatToShortDate } from '@/lib/utils';

export interface FlattenedRecord {
  month: string;
  account: string;
  phone: string;
  bbId: string;
  serviceStartDate: string;
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Options: 10, 25, 50, 100

  

  // Extract unique Month-Year options dynamically from our state log array
  const availableMonths = useMemo(() => {
    const months = liveData.map((row) => row.month).filter(Boolean);
    return Array.from(new Set(months)).sort();
  }, [liveData]);

  const handleMonthToggle = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

//   // 1. Primary Filter Tier: Evaluate based on checkmark combinations
//   const monthFilteredData = useMemo(() => {
//     if (selectedMonths.length === 0) return liveData;
//     return liveData.filter((row) => selectedMonths.includes(row.month));
//   }, [selectedMonths, liveData]);

//   // 2. Secondary Filter Tier: Search within matching monthly logs
//   const finalFilteredResults = useMemo(() => {
//     return monthFilteredData.filter((row) => {
//       const query = searchQuery.trim().toLowerCase();
//       if (!query) return true;
//       return (
//         row.phone.toLowerCase().includes(query) ||
//         row.account.toLowerCase().includes(query) ||
//         row.bbId.toLowerCase().includes(query)
//       );
//     });
//   }, [searchQuery, monthFilteredData]);

//   // 3. Mathematical Reducer: Sum up values for the matching matrix
//   const revenueShareSummary = useMemo(() => {
//     return finalFilteredResults.reduce((sum, row) => sum + row.share, 0);
//   }, [finalFilteredResults]);

// components/DashboardClient.tsx (Part 1 - Data Pivot Computations)

  // 1. Primary Filter Tier: Evaluate rows matching checkmark selection grids
  const monthFilteredData = useMemo(() => {
    if (selectedMonths.length === 0) return liveData;
    return liveData.filter((row) => selectedMonths.includes(row.month));
  }, [selectedMonths, liveData]);

  // 2. Pivot Transformation: Group by identity indicators and pivot months into columns
  const pivotedResults = useMemo(() => {
    const grouped: Record<string, {
      account: string;
      phone: string;
      bbId: string;
      serviceStartDate: string;
      status: string;
      invoiceSum: number;
      shares: Record<string, number>;
    }> = {};

    monthFilteredData.forEach((row) => {
      // Group records using the Telephone Number as a unique key identifier
      if (!grouped[row.phone]) {
        grouped[row.phone] = {
          account: row.account,
          phone: row.phone,
          bbId: row.bbId,
          serviceStartDate: row.serviceStartDate,
          status: row.status,
          invoiceSum: 0,
          shares: {}
        };
      }
      
      // Accumulate totals and distribute monthly revenue shares into properties
      grouped[row.phone].invoiceSum += row.invoice;
      grouped[row.phone].shares[row.month] = (grouped[row.phone].shares[row.month] || 0) + row.share;
    });

    return Object.values(grouped);
  }, [monthFilteredData]);

  // 3. Third Filter Tier: Search *within* pivoted results using text queries
  const finalFilteredResults = useMemo(() => {
    return pivotedResults.filter((row) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        row.phone.toLowerCase().includes(query) ||
        row.account.toLowerCase().includes(query) ||
        row.bbId.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, pivotedResults]);

  // Determine the columns to display based on selections (or show all available months)
  const activeMonthColumns = useMemo(() => {
    if (selectedMonths.length > 0) return [...selectedMonths].sort();
    
    // Fallback: If no checkbox is ticked, identify all distinct month flags in current views
    const months = liveData.map((row) => row.month).filter(Boolean);
    return Array.from(new Set(months)).sort();
  }, [selectedMonths, liveData]);

  // Compute aggregated metric sums across filtered matrices
  const combinedRevenueShareTotal = useMemo(() => {
    let total = 0;
    finalFilteredResults.forEach((row) => {
      activeMonthColumns.forEach((m) => {
        total += row.shares[m] || 0;
      });
    });
    return total;
  }, [finalFilteredResults, activeMonthColumns]);

  const tableColumnGrandTotals = useMemo(() => {
    let invoiceGrandTotal = 0;
    const monthlyShareTotals: Record<string, number> = {};

    // Initialize all active month categories to zero
    activeMonthColumns.forEach(month => {
      monthlyShareTotals[month] = 0;
    });

    // Run summation loops across the active filtered dataset
    finalFilteredResults.forEach((row) => {
      invoiceGrandTotal += row.invoiceSum;
      activeMonthColumns.forEach((month) => {
        monthlyShareTotals[month] += row.shares[month] || 0;
      });
    });

    return {
      invoiceGrandTotal,
      monthlyShareTotals,
    };
  }, [finalFilteredResults, activeMonthColumns]);
  
  // Calculate slice positions based on active page configuration
    const totalRecords = finalFilteredResults.length;
    const totalPages = Math.ceil(totalRecords / rowsPerPage);

    const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return finalFilteredResults.slice(startIndex, endIndex);
    }, [currentPage, rowsPerPage, finalFilteredResults]);


    // const handleDataParsed = async (parsedData: any[]) => {
    //     setSyncMessage(null);
    //     setSelectedMonths([]); 
    
    //     const dynamicRows: FlattenedRecord[] = parsedData.map((row) => ({
    //       month: String(row['COMMISSION MONTH'] || ''),
    //       account: String(row['BILLING ACCC NUM'] || ''),
    //       phone: String(row['TELEPHONE NUM'] || ''),
    //       bbId: String(row['BB USER ID'] || ''),
    //       status: String(row['SERVICE STATUS'] || 'ACTIVE'),
    //       invoice: parseFloat(row['TOTAL INVOICE AMOUNT']) || 0,
    //       share: parseFloat(row['REVENUE SHARE AMT GENERATED']) || 0,
    //     }));
    
    //     setLiveData(dynamicRows);
    
    //     const result = await uploadReportData(parsedData);
    //     if (result.success) {
    //       setSyncMessage({ type: 'success', text: result.message ?? 'Database synced successfully!' });
    //     } else {
    //       setSyncMessage({ type: 'error', text: result.error ?? 'Failed to sync with MongoDB Atlas.' });
    //     }
    //   };

    const handleDataParsed = async (parsedData: any[]) => {
        setSyncMessage(null);
        setSelectedMonths([]); 
    
        // 1. Instantly maps records to flat elements to update your UI layout grid
        const dynamicRows: FlattenedRecord[] = parsedData.map((row) => ({
          month: String(row['COMMISSION MONTH'] || ''),
          account: String(row['BILLING ACCC NUM'] || ''),
          phone: String(row['TELEPHONE NUM'] || ''),
          bbId: String(row['BB USER ID'] || ''),
          serviceStartDate: formatToShortDate(row['SERVICE START DATE'] || ''),
          status: String(row['SERVICE STATUS'] || 'ACTIVE'),
          invoice: parseFloat(row['TOTAL INVOICE AMOUNT']) || 0,
          share: parseFloat(row['REVENUE SHARE AMT GENERATED']) || 0,
        }));
        setLiveData(dynamicRows);
    
        try {
          // 🛠️ 2. THE ABSOLUTE SANITIZATION FIX
          // Converts complex Date classes and prototype formats into plain primitives
          const plainSerializedData = JSON.parse(JSON.stringify(parsedData));
    
          // 🛠️ 3. Pass the clean, sanitized data array to the Server Action instead of the raw one
          const result = await uploadReportData(plainSerializedData);
          
          if (result.success) {
            setSyncMessage({ 
              type: 'success', 
              text: result.message ?? 'Database collection synchronized successfully!' 
            });

            // browser popup alert confirming sucess
            alert('🎉 Report successfully uploaded and saved to MongoDB Atlas!');
            window.location.reload();
          } else {
            setSyncMessage({ 
              type: 'error', 
              text: result.error ?? 'Failed to complete database operation.' 
            });

            // 🛠️ ALERT POPUP TYPE 1: Triggers alert if the server action passes back an error string
            alert(`❌ Database Sync Failure:\n\n${result.error}`);
          }
        } catch (err: any) {
            console.error('Client Catch Error Wrapper:', err);
      
            // Extract the nested message text cleanly
            const rawErrorMessage = err.message || '';
            let clearUserExplanation = 'An unexpected database connection error occurred.';

            // Check if Prisma's network socket timeout indicators are present in the trace
            if (rawErrorMessage.includes('P2010') || rawErrorMessage.includes('Server selection timeout')) {
                clearUserExplanation = 
                '🚨 MongoDB Atlas Connection Blocked!\n\n' +
                'Reason: The database server actively refused the connection handshake.\n\n' +
                'Action Required:\n' +
                '1. Log into your MongoDB Atlas Cloud Console dashboard.\n' +
                '2. Navigate to Security -> Network Access.\n' +
                '3. Make sure your current network public IP address is whitelisted (or add 0.0.0.0/0 to allow connections from anywhere).';
            } else {
                clearUserExplanation = `System Exception: ${rawErrorMessage}`;
            }

          setSyncMessage({ 
            type: 'error', 
            text: clearUserExplanation || err.message || 'An unexpected serialization parse boundary error occurred.' 
          });

            // 🛠️ ALERT POPUP TYPE 2: Interrupts viewport and forces pop up layout message text
            alert(clearUserExplanation);
        }
      };

    

    //   Download section
    const handleDownloadExcel = () => {
        try {
          if (finalFilteredResults.length === 0) {
            alert('No data rows available to export.');
            return;
          }
    
          // Map grouped profiles to structural column rows
          const exportRows = finalFilteredResults.map((row, idx) => {
            const baseRow: Record<string, any> = {
              'sl.No.': idx + 1,
              'Telephone number': row.phone,
              'Billing Account': row.account,
              'BB User ID': row.bbId,
              'Service Start Date': row.serviceStartDate,
              'Total Invoice Amount': row.invoiceSum,
            };
    
            // Inject dynamic column properties horizontally for each month
            activeMonthColumns.forEach((month) => {
              baseRow[`${month} share`] = row.shares[month] || 0;
            });
    
            return baseRow;
          });
    
          const worksheet = XLSX.utils.json_to_sheet(exportRows);
          
          // Auto-set tracking row column widths
          worksheet['!cols'] = [
            { wch: 8 },  { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 },    
            ...activeMonthColumns.map(() => ({ wch: 18 }))
          ];
    
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Pivoted Billing Logs');
          
          const fileLabel = selectedMonths.length > 0 ? selectedMonths.join('_') : 'ALL_MONTHS';
          XLSX.writeFile(workbook, `Pivoted_Billing_Report_${fileLabel}.xlsx`);
        } catch (error) {
          console.error('Spreadsheet generator broken:', error);
          alert('Failed to parse columns.');
        }
      };
        
    //   short date format
    // Reconstructs any JavaScript Date object into the standard 'DD-MMM-YYYY' layout
    
  
      return (
        <div className="space-y-6">
          {/* EXCEL PARSING LOADER WIDGET */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Monthly Report</h2>
            <ExcelUploadParser 
              onDataParsed={handleDataParsed}
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
    
          {/* REACTIVE MONTH-YEAR TICK SELECTION PANEL */}
          <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
              <span>Filter by Month-Year Batch</span>
              {selectedMonths.length > 0 && (
                <button onClick={() => setSelectedMonths([])} className="text-xs text-blue-600 font-semibold hover:underline">
                  Clear Selection
                </button>
              )}
            </h3>
            {availableMonths.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {availableMonths.map((month) => (
                  <label 
                    key={month} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                      selectedMonths.includes(month)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month)}
                      onChange={() => {
                        handleMonthToggle(month)
                        setCurrentPage(1); // Reset back to page 1 on layout resize
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    {month}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No batch timelines tracked yet. Upload a data spreadsheet file above.</p>
            )}
          </section>

        {/* Search Bar  */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
            {selectedMonths.length > 0 
                ? `Search Records within Selected Months (${selectedMonths.join(', ')})` 
                : 'Search Across Entire Data Log'}
            </label>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset back to page 1 on layout resize
                }}
                placeholder="Search by Telephone Number, Billing Account, or BB User ID..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </section>

        {/* COMBINED REVENUE METRICS ROW CARD */}
        <section className="w-full">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                {selectedMonths.length > 0 
                ? `Combined Revenue Share (${selectedMonths.join(', ')})` 
                : 'Total Revenue Share (Entire Uploaded Data)'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-emerald-900">
                ₹{combinedRevenueShareTotal.toLocaleString('en-IN')}
                </span>
            </div>
            <p className="mt-1 text-xs text-emerald-700">
                {selectedMonths.length > 0 
                ? `Summed payout across checked milestones matching your current identifier lookup conditions.`
                : `Summed total payout across all historical customer profiles within the database collection.`}
            </p>
            </div>
        </section>
      {/* // components/DashboardClient.tsx (Part 4 - Data Grid Table Workspace) */}
      {/* <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">Matching Billing Log Records ({finalFilteredResults.length})</h2>
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
              {finalFilteredResults.length > 0 ? (
                finalFilteredResults.map((row, idx) => (
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
                    No matching telecom log rows match your current search context criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section> */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* TOP CONTROLS: METRICS COUNTER AND ROWS PER PAGE SELECTOR */}
        {/* <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
            <h2 className="font-bold text-gray-800">Matching Billing Log Records ({totalRecords})</h2>
            <p className="text-xs text-gray-400">Showing page {totalPages > 0 ? currentPage : 0} of {totalPages}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
            <label htmlFor="rowsPerPage" className="text-gray-600 font-medium">Rows per page:</label>
            <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset back to page 1 on layout resize
                }}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
            >
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
            </select>
            </div>
        </div> */}

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
            <h2 className="font-bold text-gray-800">Matching Billing Log Records ({totalRecords})</h2>
            <p className="text-xs text-gray-400">Showing page {totalPages > 0 ? currentPage : 0} of {totalPages}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
            {/* 🛠️ EXCEL DOWNLOAD BUTTON ELEMENT */}
            <button
                onClick={handleDownloadExcel}
                disabled={finalFilteredResults.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Records {selectedMonths.length > 0 ? selectedMonths.join(', ') : 'ALL_MONTHS'} (.xlsx)
            </button>

            <div className="flex items-center gap-2 text-sm">
                <label htmlFor="rowsPerPage" className="text-gray-600 font-medium">Rows per page:</label>
                <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                >
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                </select>
            </div>
            </div>
        </div>

        {/* TABLE PRESENTATION LAYER */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
            <thead>
                <tr className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider text-xs border-b border-gray-200">
                    <th className="px-6 py-3">Billing Account</th>
                    <th className="px-6 py-3">Telephone Num</th>
                    <th className="px-6 py-3">BB User ID</th>
                    <th className="px-6 py-3">Service Start Date</th>
                    <th className="px-6 py-3 text-right">Total Invoice Sum</th>
                    {/* 🛠️ Map your monthly headers dynamically across the top row */}
                    {activeMonthColumns.map((month) => (
                        <th key={month} className="px-6 py-3 text-right">{month} Share</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {paginatedResults.length > 0 ? (
                paginatedResults.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono">{row.account}</td>
                    <td className="px-6 py-4 font-mono">{row.phone}</td>
                    <td className="px-6 py-4 font-mono">{row.bbId}</td>
                    <td className="px-6 py-4 font-mono">{String(row.serviceStartDate)}</td>
                    <td className="px-6 py-4 text-right font-semibold">₹{row.invoiceSum.toLocaleString('en-IN')}</td>
                    {/* 🛠️ Map out corresponding cell logs horizontally matching headers */}
                    {activeMonthColumns.map((month) => (
                        <td key={month} className="px-6 py-4 text-right text-emerald-600 font-bold">
                        {row.shares[month] ? `₹${row.shares[month].toLocaleString('en-IN')}` : '₹0'}
                        </td>
                    ))}
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan={3 + activeMonthColumns.length} className="px-6 py-10 text-center text-gray-400">
                    No matching records found for the selected configurations.
                    </td>
                </tr>
                )}
            </tbody>
            {/* 🛠️ NEW INTERACTIVE GRAND TOTAL FOOTER BLOCK */}
            {finalFilteredResults.length > 0 && (
                <tfoot className="bg-gray-100/80 border-t-2 border-gray-300 font-bold text-gray-900 sticky bottom-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <tr className="divide-x divide-gray-200/50">
                    <td className="px-6 py-4 font-semibold text-gray-700">Grand Total</td>
                    <td colSpan={3} className="px-6 py-4 text-center text-xs tracking-wider text-gray-400 font-medium uppercase">
                        {finalFilteredResults.length} Subscribers
                    </td>
                    {/* Total Invoice Amount Column Sum */}
                    <td className="px-6 py-4 text-right font-extrabold text-gray-900 bg-gray-200/40">
                    ₹{tableColumnGrandTotals.invoiceGrandTotal.toLocaleString('en-IN')}
                    </td>
                    {/* Map out dynamic column calculations horizontally */}
                    {activeMonthColumns.map((month) => (
                    <td key={month} className="px-6 py-4 text-right font-extrabold text-emerald-700 bg-emerald-50/40">
                        ₹{(tableColumnGrandTotals.monthlyShareTotals[month] || 0).toLocaleString('en-IN')}
                    </td>
                    ))}
                </tr>
                </tfoot>
            )}
            </table>
        </div>

        {/* BOTTOM PAGINATION FOOTER BLOCK CONTROLS */}
        {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords)} to {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords} records
            </span>

            <div className="inline-flex items-center gap-2">
                <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                Previous
                </button>
                
                <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                Next
                </button>
            </div>
            </div>
        )}
        </section>

    </div>
  );
}
    