// components/DashboardClient.tsx (Part 1 - Core Imports, Interfaces & State)
'use client';

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import ExcelUploadParser from '@/components/ExcelUploadParser';
import { uploadBothData } from '@/app/actions/uploadReport1';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface LogRow {
  month: string;
  account: string;
  phone: string;
  bbId?: string;
  serviceStartDate: string;
  invoice: number;
  share: number;
  remarks?: string;
}

interface DashboardClientProps {
  ftthInitial: LogRow[];
  llInitial: LogRow[];
}

export default function DashboardClient({ ftthInitial, llInitial }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'FTTH' | 'LEASED_LINE'>('FTTH');
  const [searchQuery, setSearchQuery] = useState('');

  
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // scrollable data for month-year
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // 1. Hook to manage asynchronous server processing state indicators natively
  const [isPending, startTransition] = useTransition();

  const [dbStorage, setDbStorage] = useState<{ usedMb: number; usagePercentage: number; isApproachingLimit: boolean } | null>(null);

  // progress
  const [uploadProgress, setUploadProgress] = useState<{ total: number; processed: number; percentage: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 🛠️ NEW TIMER STATE: Tracks the processing duration elapsed in seconds
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // 1. Direct active state target toggle pointer (Isolates collections completely)
  const activeTabRawData = useMemo(() => {
    return activeTab === 'FTTH' ? ftthInitial : llInitial;
  }, [activeTab, ftthInitial, llInitial]);

  // Extract unique Month-Year selection keys dynamically from the raw array loop
  const availableMonths = useMemo(() => {
    const months = activeTabRawData.map((row) => row.month).filter(Boolean);
    const uniqueMonths = Array.from(new Set(months));

    // Calendar matrix dictionary used to convert names back into numberic index
    const monthOrder : Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };

    return uniqueMonths.sort((a, b) => { 
      // Split strings into token parts e.g. "JAN-2026" -> ["JAN", "2026"]
      const [monthA, yearA] = a.split('-');
      const [monthB, yearB] = b.split('-')

      const numYearA = parseInt(yearA, 10) || 0;
      const numYearB = parseInt(yearB, 10) || 0;

      // 1. First Tier sort: Primary evaluation using the numeric calender year
      if(numYearA !== numYearB){
        return numYearB - numYearA; // Descending order (higher year comes first)
      }

      // 2. Secondary Tier Sort: Fallback evaluation using Month Calender Mapping order
      const indexA = monthOrder[monthA?.toUpperCase()] ?? 0;
      const indexB = monthOrder[monthB?.toUpperCase()] ?? 0;

      return indexB - indexA; // Descending order ( later month in the year comes first)

    })

    // return Array.from(new Set(months)).sort();
  }, [activeTabRawData]);

  // Hierarchical Tree Engine: regroup raw months into structural calendar
  const yearMonthTree = useMemo(() => {
    const tree: Record<string, string[]> = {};
    availableMonths.forEach((mStr) => {
      const [_, yearToken] = mStr.split('-');
      if(yearToken){
        if(!tree[yearToken]) tree[yearToken] = [];
        tree[yearToken].push(mStr);
      }
    });
    return tree; // e.g., { "2026" :["JAN-2026", "FEB-2026"], "2025" :["DEC-2025", "NOV-2025"]}
  }, [availableMonths]);

  const uniqueYearsList = useMemo(() => Object.keys(yearMonthTree).sort(), [yearMonthTree]);

  // Handle clicking year parent checkbox selectors
  const handleYearToggle = (year: string) => {
    setSelectedYears((prev) => {
      const isChecking = !prev.includes(year);
      const updatedYears = isChecking ? [...prev, year] : prev.filter((y) => y !== year);

      // Auto-clear child month checkboxes if a parent year is unchecked to prevent hidden selections
      if(!isChecking) {
        const monthsInYear = yearMonthTree[year] || [];
        setSelectedMonths((mPrev) => mPrev.filter((m) => !monthsInYear.includes(m)));
      }
      return updatedYears
    })
    setCurrentPage(1);
  }

  // Multi-Tier cascading Filter Matrix
  // Step 1: Determine exactly which Month-Year columns should appear on the Screen
  const targetActiveMonths = useMemo(() => {
    // Case A: No Year checkboxes are checkmarked -> Fall back to displaying all available columns
    if(selectedYears.length === 0) return [...availableMonths];

    // Case B: Parent Years are checkmarked -> Figure out if child months are also checkmarked
    const activeMonths: string[] = [];
    selectedYears.forEach((year) => {
      const allMonthsInYear = yearMonthTree[year] || [];
      const checkedMonthsInYear = allMonthsInYear.filter((m) => selectedMonths.includes(m));

      // 🔍 KEY RULE: If a year is checkmarked but NO specific month is ticked, include ALL months for that year
      if(checkedMonthsInYear.length === 0){
        activeMonths.push(...allMonthsInYear);
      }else{
        // If specific months are checkmarked under that year, show ONLY those selected months
        activeMonths.push(...checkedMonthsInYear);
      }
    })

    return Array.from(new Set(activeMonths)).sort((a, b) => availableMonths.indexOf(a) - availableMonths.indexOf(b));

  }, [selectedYears, selectedMonths, availableMonths, yearMonthTree]);



  // Handle checking and unchecking individual month checkboxes
  const handleMonthToggle = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
    setCurrentPage(1); // Force return page index pointer safely back to 1
  };
  // components/DashboardClient.tsx (Part 2 - Pivot Logic, Keyword Matching & Pagination)

  // 2. Primary Filter Tier: Filter initial rows by checked Month-Year checkboxes
  const monthFilteredData = useMemo(() => {
    return activeTabRawData.filter((row) => targetActiveMonths.includes(row.month))
  }, [targetActiveMonths, activeTabRawData])

  // 3. Pivot Transformation: Group by telephone number and aggregate values horizontally
  const pivotedResults = useMemo(() => {
    const grouped: Record<string, {
      account: string;
      phone: string; //Acts as Telephone for FTTH, and Circuit Id for Leased Lines
      bbId: string;
      serviceStartDate: string;
      invoiceSum: number;
      shares: Record<string, number>;
      recordCount: number;  // Tracker to flag duplicate row counts
      endpointTags: Record<string, Set<string>>;
      // 🛠️ Track individual spreadsheet row breakdowns for the hover tooltips
      rowSplits: Array<{ month: string; phone: string, invoiceNum: string; share: number; invoice: number }>;
    }> = {};

    monthFilteredData.forEach((row: LogRow) => {
      const identityKey = String(row.account || '').trim();

      if(!identityKey || identityKey === 'undefined') return; // skip empty rows safely

      if (!grouped[identityKey]) {
        grouped[identityKey] = {
          account: identityKey,
          // If leased Line, copy the LCID value straight into the phone placeholder 
          phone: String(row.phone || ''),
          bbId: String(row.bbId || ""),
          serviceStartDate: String(row.serviceStartDate),
          invoiceSum: 0,
          shares: {}, 
          recordCount: 0,
          endpointTags: {},
          rowSplits: [] // Initialize itemized array context
        };
      }

      // Increment profile frequency tracker whenever a duplicate key matches
      grouped[identityKey].recordCount += 1;

      grouped[identityKey].invoiceSum += Number(row.invoice || 0);

      grouped[identityKey].shares[row.month] = (grouped[identityKey].shares[row.month] || 0) + Number(row.share || 0);

       // 🛠️ Save itemized splits for the hover tooltip popup window layout
       grouped[identityKey].rowSplits.push({
        month: row.month,
        phone: row.phone,
        invoiceNum: (row as any).invoiceNum || 'N/A', // Captures raw invoice reference tokens safely
        invoice: Number(row.invoice || 0),
        share: Number(row.share || 0)
      });

      // Extract endpoint tags from remarks (e.g., "[END_A]") to verify uniqueness
      if (!grouped[identityKey].endpointTags[row.month]) {
        grouped[identityKey].endpointTags[row.month] = new Set<string>();
      }

      // 🛠️ FIX: Clean regex matching text extraction logic
      const remarksText = String(row.remarks || '').toUpperCase().trim();

      
      if (remarksText.includes('END_A') || remarksText.includes('END_A]')) {
        grouped[identityKey].endpointTags[row.month].add('END_A');
      } else if (remarksText.includes('END_B') || remarksText.includes('END_B]')) {
        grouped[identityKey].endpointTags[row.month].add('END_B');
      } else {
        // Fallback marker for plain row lines
        grouped[identityKey].endpointTags[row.month].add('END_A');
      }
    });

    // 🛠️ FIX: Sort the results dynamically by Billing Account (Ascending order)
    return Object.values(grouped).sort((a, b) => a.account.localeCompare(b.account, undefined, { numeric: true }));
  }, [monthFilteredData, activeTab]);

  // console.log(pivotedResults);

  // 4. Secondary Filter Tier: Complete global search across multiple fields
  const finalFilteredResults = useMemo(() => {
    return pivotedResults.filter((row) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        (row.phone || '').toLowerCase().includes(query) ||
        (row.account || '').toLowerCase().includes(query) ||
        (row.bbId || '').toLowerCase().includes(query)
      );
    });
  }, [searchQuery, pivotedResults]);

  // Determine dynamic month headers to map horizontally across grid templates
  // const orderedSelectedMonths = useMemo(() => {
  //   if (selectedMonths.length > 0) 
  //     // If specific boxer are ticked, map them following the same order rules
  //     return [...selectedMonths].sort((a, b) => availableMonths.indexOf(a) - availableMonths.indexOf(b));
  //   return [...availableMonths]; // Seamlessly maps down descedning batch rows
  // }, [selectedMonths, availableMonths]);

  const activeMonthColumns = useMemo(() => {
    if (showAllMonths) return targetActiveMonths;
    return targetActiveMonths.slice(0, 3); // Limit to the first 4 columns
  }, [targetActiveMonths, showAllMonths]);

   // Total hidden months counter badge
   const hiddenMonthsCount = targetActiveMonths.length - activeMonthColumns.length;

  // Pagination bounds arithmetic setup
  const totalRecords = finalFilteredResults.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return finalFilteredResults.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, rowsPerPage, finalFilteredResults]);

  // Grand Column summary totals mathematical reducer
  const columnGrandTotals = useMemo(() => {
    let invoiceGrandTotal = 0;
    const monthlyShareTotals: Record<string, number> = {};
    activeMonthColumns.forEach(m => { monthlyShareTotals[m] = 0; });

    finalFilteredResults.forEach((row) => {
      invoiceGrandTotal += row.invoiceSum;
      activeMonthColumns.forEach((m) => {
        monthlyShareTotals[m] += row.shares[m] || 0;
      });
    });
    return { invoiceGrandTotal, monthlyShareTotals };
  }, [finalFilteredResults, activeMonthColumns]);
// components/DashboardClient.tsx (Part 3 - Excel Upload Parsers & File Exporters)

const handleExcelParsed = async (parsedData: any[]) => {
  if (!parsedData || parsedData.length === 0) return;

  setSyncMessage(null);
  setSelectedMonths([]);
  setCurrentPage(1);
  setIsUploading(true);
  setUploadProgress({ total: parsedData.length, processed: 0, percentage: 0 });
  
  // 🛠️ START THE CLOCK TIMER: Reset to 0 and increment every 1 second
  setElapsedTime(0);
  const timerInterval = setInterval(() => {
    setElapsedTime((prev) => prev + 1);
  }, 1000);

  startTransition(async () => {
    try {
      const CLIENT_CHUNK_SIZE = 100;
      let cumulativeProcessed = 0;

      const cleanSerialized = JSON.parse(JSON.stringify(parsedData));

      for (let i = 0; i < cleanSerialized.length; i += CLIENT_CHUNK_SIZE) {
        const chunk = cleanSerialized.slice(i, i + CLIENT_CHUNK_SIZE);
        
        const result = await uploadBothData(chunk);
        
        if (!result.success) {
          clearInterval(timerInterval); // Stop clock on failure
          setSyncMessage({ type: 'error', text: result.error });
          alert(`❌ Database Sync Failure:\n\n${result.error}`);
          setIsUploading(false);
          setUploadProgress(null);
          return;
        }

        cumulativeProcessed += chunk.length;
        const currentPercentage = Math.min(Math.round((cumulativeProcessed / cleanSerialized.length) * 100), 100);
        
        setUploadProgress({
          total: cleanSerialized.length,
          processed: cumulativeProcessed,
          percentage: currentPercentage
        });
      }

      // 🛠️ SUCCESS: Clear clock timer cleanly on processing completion
      clearInterval(timerInterval);
      setSyncMessage({ type: 'success', text: `Successfully synced all ${cleanSerialized.length} records!` });
      alert('🎉 Report successfully uploaded and saved to MongoDB Atlas!');
      window.location.reload(); 

    } catch (err: any) {
      clearInterval(timerInterval); // Stop clock on exception crash
      console.error('Network catch boundary intercept:', err);
      const rawErrorMessage = err.message || '';
      let clearUserExplanation = 'An unexpected database connection error occurred.';

      if (rawErrorMessage.includes('P2010') || rawErrorMessage.includes('Server selection timeout')) {
        clearUserExplanation = 
          '🚨 MongoDB Atlas Connection Blocked!\n\n' +
          'Reason: The database server actively refused the connection handshake.\n\n' +
          'Action Required:\n' +
          '1. Log into your MongoDB Atlas Cloud Console.\n' +
          '2. Navigate to Security -> Network Access.\n' +
          '3. Add your current public IP address to the whitelist (or enter 0.0.0.0/0 to allow connections from anywhere).';
      } else {
        clearUserExplanation = `System Exception: ${rawErrorMessage}`;
      }

      setSyncMessage({ type: 'error', text: clearUserExplanation });
      alert(clearUserExplanation);
      setIsUploading(false);
      setUploadProgress(null);
    }
  });
};



const handleDownloadExcel = () => {
  try {
    if (finalFilteredResults.length === 0) return;
    
    const exportRows = finalFilteredResults.map((row, idx) => {
      const baseRow: Record<string, any> = {
        'sl.No.': idx + 1,
        'Telephone number': row.phone,
        'Billing Account': row.account,
        'Service start date': row.serviceStartDate,
        'Total Invoice Amount': row.invoiceSum,
      };
      // Inject dynamic monthly parameters horizontally column-wise
      activeMonthColumns.forEach((m) => {
        baseRow[`${m} share`] = row.shares[m] || 0;
      });
      return baseRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, ...activeMonthColumns.map(() => ({ wch: 18 }))];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pivoted Report');
    XLSX.writeFile(wb, `${activeTab}_Pivoted_Revenue_Report.xlsx`);
  } catch (error) {
    alert('Failed to generate export file pipeline configuration.');
  }
};

  // Hook to fetch and poll database capacity limits instantly upon mounting the workspace dashboard
  useEffect(() => {
    async function checkStorageFootprint() {
      // Direct client check lookup call to our Server Action background monitor engine
      const { getDatabaseStorageStatus } = await import('@/app/actions/dbStats');
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
    // Poll the cluster size every 60 seconds to keep track of concurrent updates
    const interval = setInterval(checkStorageFootprint, 60000);
    return () => clearInterval(interval);
  }, [ftthInitial, llInitial]); // Refreshes automatically whenever database rows change


return (
  <div className="space-y-6">

    {/* 🛠️ 2FA SECURED PERSISTENT DATABASE STORAGE OVERFLOW WARNING ALERT BANNER */}
    {dbStorage?.isApproachingLimit && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white px-6 py-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse border border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">⚠️</span>
            <div>
              <h4 className="text-sm font-black tracking-wide uppercase">Critical Storage Warning: Database Cluster Filling Up!</h4>
              <p className="text-xs text-red-50/90 font-medium mt-0.5">
                Your MongoDB Atlas allocation has consumed <span className="font-bold underline">{dbStorage.usedMb} MB</span> ({Math.round(dbStorage.usagePercentage)}%) of your current 512 MB free tier quota limits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Visual Progress Data Bar Grid Indicator */}
            <div className="w-24 bg-black/30 h-2 rounded-full overflow-hidden border border-white/10 hidden md:block">
              <div className="bg-white h-full rounded-full" style={{ width: `${dbStorage.usagePercentage}%` }}></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              Action Required
            </span>
          </div>
        </div>
      )}

    {/* SEPARATED ISOLATED COLLECTION TAB CONTROL HEADERS */}
    <div className="border-b border-gray-200 bg-white px-6 py-2 rounded-xl shadow-sm flex items-center justify-between">
      <div className="flex space-x-6">
        <button
          onClick={() => { setActiveTab('FTTH'); setCurrentPage(1); setSearchQuery(''); setSelectedMonths([]); }}
          className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'FTTH' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'
          }`}
        >
          📊 FTTH Broadband
        </button>
        <button
          onClick={() => { setActiveTab('LEASED_LINE'); setCurrentPage(1); setSearchQuery(''); setSelectedMonths([]); }}
          className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'LEASED_LINE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'
          }`}
        >
          ⚡ Leased Circuits (LL)
        </button>
      </div>
      <span className="text-xs font-bold uppercase bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
        Active Store: {activeTab === 'FTTH' ? 'Subscriber Collection' : 'LeasedLine Collection'}
      </span>
    </div>

    {/* EXCEL UPLOAD DISTRIBUTOR CONTAINER ZONE */}
    <section className="rounded-xl bg-white p-6 border shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Latest {activeTab === 'FTTH' ? 'FTTH' : 'Leased Line'} Spreadsheet Log</h2>
      <ExcelUploadParser onDataParsed={handleExcelParsed} onUploadError={(err) => setSyncMessage({ type: 'error', text: err })} />
      {syncMessage && (
        <div className={`mt-3 p-3 text-sm rounded-lg border whitespace-pre-line ${syncMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {syncMessage.text}
        </div>
      )}
    </section>

    {/* NESTED YEAR-MONTH CONTROLLER ACCORDION PANEL */}
    <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-extrabold text-gray-800">Filter Revenue Ledger by Year & Month</h3>
          {(selectedYears.length > 0 || selectedMonths.length > 0) && (
            <button 
              onClick={() => { setSelectedYears([]); setSelectedMonths([]); setCurrentPage(1); }} 
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {uniqueYearsList.length > 0 ? (
          <div className="space-y-4 divide-y divide-gray-100">
            {uniqueYearsList.map((year) => {
              const isYearChecked = selectedYears.includes(year);
              const monthsInYear = yearMonthTree[year] || [];

              return (
                <div key={year} className="pt-3 first:pt-0 space-y-2">
                  {/* Parent Year Checkbox Row */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-black cursor-pointer transition-colors max-w-xs ${isYearChecked ? 'border-blue-500 bg-blue-50/50 text-blue-700' : 'border-gray-200 bg-gray-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={isYearChecked} 
                      onChange={() => handleYearToggle(year)} 
                      className="rounded text-blue-600 h-4 w-4" 
                    />
                    <span>📅 Year {year} Ledger</span>
                  </label>

                  {/* Nested Child Month Checklist (Reveals dynamically when parent year is checked) */}
                  {isYearChecked && (
                    <div className="pl-6 pt-1 flex flex-wrap gap-2 animate-fadeIn">
                      {monthsInYear.map((mStr) => {
                        const isMonthChecked = selectedMonths.includes(mStr);
                        const [monthLabel] = mStr.split('-');

                        return (
                          <label key={mStr} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors font-semibold ${isMonthChecked ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                            <input 
                              type="checkbox" 
                              checked={isMonthChecked} 
                              onChange={() => handleMonthToggle(mStr)} 
                              className="rounded text-indigo-600 h-3.5 w-3.5" 
                            />
                            <span className='flex flex-1 gap-1 relative'>
                              {monthLabel}-{year} 
                              <span className='absolute -mx-10 -my-3 flex justify-center bg-slate-600 text-[6pt] border rounded-xl border-slate-300 px-1.5 text-emerald-100'>Payout</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 animate-pulse">No active data rows found. Upload an Excel log file above.</p>
        )}
      </section>

    {/* DYNAMIC LOOKUP INPUT FORM SEARCH SECTION */}
    <section className="bg-white p-6 rounded-xl border shadow-sm">
      <input 
        type="text" 
        value={searchQuery} 
        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
        placeholder={`Filter live ${activeTab === 'FTTH' ? 'FTTH' : 'Leased Line'} data logs dynamically by ${activeTab === 'FTTH' ? 'telephone number' : 'LC ID'} , billing account ...`} 
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 shadow-sm placeholder:text-gray-400" 
      />
    </section>

    {/* PIVOT ROWS PRESENTATION MATRIX TABLES */}
    <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-800">Live Structured Data Grid Matrix ({totalRecords})</h2>
          <p className="text-xs text-gray-400 mt-0.5">Displaying items {Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords)} to {Math.min(currentPage * rowsPerPage, totalRecords)}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 🛠️ DYNAMIC EXPANSION TOGGLE CONTROLLER BUTTON */}
          {targetActiveMonths.length > 3 && (
            <button
              onClick={() => setShowAllMonths(!showAllMonths)}
              className={`rounded-lg px-4 py-2 text-xs font-bold border transition-colors inline-flex items-center gap-1.5 ${
                showAllMonths
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {showAllMonths ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Hide Extra Months
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Show All Months ({hiddenMonthsCount} hidden)
                </>
              )}
            </button>
          )}
          {/* <button onClick={handleDownloadExcel} disabled={totalRecords === 0} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
            📥 Export Tab Sheet (.xlsx)
          </button> */}

          <TooltipProvider delay={200}>
            <Tooltip>
              {/* Wrapping the button in a div ensures the tooltip works even when the button is disabled */}
              <TooltipTrigger
                    onClick={handleDownloadExcel} 
                    disabled={totalRecords === 0} 
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    📥 Export Tab Sheet (.xlsx)
                  
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-neutral-900 text-white p-2 text-xs rounded shadow-md border border-neutral-800">
                <p>click on <span className='text-amber-600'>Show all  months </span> to get all reports before clicking on Export otherwise <span className='text-red-600'>displayed months </span> will be exported </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded-lg text-xs font-semibold px-2 py-2 bg-white text-gray-700 shadow-sm focus:outline-none">
            <option value={10}>Show 10</option> 
            <option value={25}>Show 25</option> 
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-w-full scrollbar-thin scrollbar-thumb-gray-200">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-3">Billing Account</th>
              {activeTab === 'FTTH' && (
                <th className="px-6 py-3">Telephone Num</th>
              )}
              <th className="px-6 py-3">{activeTab === 'FTTH' ? 'BB UserId' : 'Circuit ID'}</th>
              <th className="px-6 py-3">Service Start Date</th>
              <th className="px-6 py-3 text-right">Total Invoice Sum</th>
              {activeMonthColumns.map(m =>(
                // <th key={m} className="px-6 py-3 text-right whitespace-nowrap">{m} Share</th>
                <th key={m} className="px-6 py-3 text-right min-w-32.5 bg-blue-50/30">{m} Share</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedResults.length > 0 ? (
              paginatedResults.map((row, idx) => {

                const isMultiEndpointCircuit = activeTab === 'LEASED_LINE' && Object.values(row.endpointTags || {}).some(
                  (tagSet: any) => tagSet.size > 1
                );
                const isFTTHDuplicate = activeTab === "FTTH" && row.recordCount > 1;

                const shouldHighlightRow = isMultiEndpointCircuit || isFTTHDuplicate;

                return(
                  <tr 
                    key={idx} 
                    // className="hover:bg-gray-50/80 transition-colors"
                    // 🛠️ DYNAMIC COLOR HIGHLIGHTING: Tints multi-endpoint rows in soft indigo purple
                    className={`transition-colors ${
                      shouldHighlightRow 
                        ? 'bg-indigo-50/70 hover:bg-indigo-100/80 font-medium' 
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                     {/* 🛠️ FIRST COLUMN: ACCOUNT NUMBER + HOVER POPUP INTERACTIVE TOOLTIP */}
                    <td className="px-6 py-4 font-mono text-gray-900 font-bold relative group">
                      <div className="flex items-center gap-2 cursor-help">
                        <span>{row.account}</span>
                        
                        {isFTTHDuplicate && (
                          <span className="inline-flex items-center rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide border border-amber-700 shadow-sm animate-pulse">
                            🔸({row.recordCount}) 
                          </span>
                        )}
                      </div>

                      {/* 🛠️ CSS-POWERED INTERACTIVE FLOATING HOVER POPUP LAYOUT CARD */}
                      {isFTTHDuplicate && (
                        <div className="absolute left-1/4 top-10 hidden group-hover:block z-30 bg-slate-900 text-white rounded-xl p-4 shadow-2xl border border-slate-700 w-80 font-sans transform scale-95 group-hover:scale-100 transition-all duration-150">
                          <div className="border-b border-slate-700 pb-2 mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400">📊 Duplicate Row Breakdown</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{row.account}</span>
                          </div>
                          
                          {/* Scrollable Mini Ledger Sheet list wrapper */}
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                            {row.rowSplits.map((split, sIdx) => (
                              <div key={sIdx} className="text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-200 block">{split.month}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">Inv: {split.invoiceNum}</span>
                                  <span className="text-[10px] text-amber-500 font-mono">Inv: {split.phone}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-300 block">Gross: ₹{split.invoice}</span>
                                  <span className="font-bold text-emerald-400">Share: ₹{split.share}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Small indicator layout arrow pointing upwards to the source element row */}
                          <div className="absolute -top-1.5 left-6 w-3 h-3 bg-slate-900 transform rotate-45 border-t border-l border-slate-700"></div>
                        </div>
                      )}
                    </td>
                      
                    <td className="px-6 py-4 font-mono text-gray-900 font-bold flex items-center gap-2">
                      <span>{row.phone}</span>
                      
                      {/* 🛠️ Dynamic visual info badge overlay icon flag */}
                      {isMultiEndpointCircuit && (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 shadow-sm animate-pulse">
                          Dual Endpoints (A ↔ B)
                        </span>
                      )}
                    </td>
                    {activeTab === 'FTTH' && (
                        <td className="px-6 py-4 text-gray-600 font-semibold">{row.bbId || '-'}</td>
                      
                    )}
                    {/* {activeTab === 'LEASED_LINE' && (
                        <td className="px-6 py-4 text-gray-600 font-semibold">{row.phone || '-'}</td>
                    )} */}
                    {/* <td className="px-6 py-4 text-gray-600 font-semibold">{row.bbId || '-'}</td> */}
                    <td className="px-6 py-4 text-gray-500 font-medium">{row.serviceStartDate}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">₹{row.invoiceSum.toLocaleString('en-IN')}</td>
                    {activeMonthColumns.map((m) => {
                      // Check if this individual cell contains both endpoints
                      const isCellMultiEndpoint = activeTab === 'LEASED_LINE' && row.endpointTags?.[m]?.size > 1;
                      return (
                        <td 
                          key={m} 
                          // 🛠️ Tints the individual month cell a deeper color if it contains combined revenue totals
                          className={`px-6 py-4 text-right font-extrabold transition-colors ${
                            isCellMultiEndpoint 
                              ? 'text-indigo-700 bg-indigo-100/30' 
                              : 'text-emerald-600'
                          }`}
                        >
                          {row.shares[m] ? `₹${row.shares[m].toLocaleString('en-IN')}` : '₹0'}
                        </td>
                      );
                    })}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={activeTab === 'FTTH' ? 5 + activeMonthColumns.length : 4 + activeMonthColumns.length} className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                  No matching records available for the active configuration parameters.
                </td>
              </tr>
            )}
          </tbody>
          {finalFilteredResults.length > 0 && (
            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900 sticky bottom-0">
              <tr>
                <td className="px-6 py-4 text-gray-800">Grand Total</td>
                
                <td colSpan={activeTab==='FTTH' ? 3 : 2 } className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{totalRecords} Distinct Profiles Matrixed</td>
                <td className="px-6 py-4 text-right text-gray-900 font-extrabold bg-gray-200/30">₹{columnGrandTotals.invoiceGrandTotal.toLocaleString('en-IN')}</td>
                {activeMonthColumns.map(m => (
                  <td key={m} className="px-6 py-4 text-right font-extrabold text-emerald-700 bg-emerald-50/30">
                    ₹{(columnGrandTotals.monthlyShareTotals[m] || 0).toLocaleString('en-IN')}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* PAGINATION NAVIGATION STEPPING PANEL CONTROLS */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <div className="inline-flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-40">Previous</button>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </section>

     {/* REAL-TIME ROW COUNTER, PERCENTAGE COMPLETION & ELAPSED TIME MODAL OVERLAY */}
      {isUploading && uploadProgress && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md transition-opacity">
          <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full mx-4 text-center space-y-4">
            
            {/* Pulsing Spinning Ring Loader */}
            <div className="relative">
              <svg className="h-16 w-16 animate-spin text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.162 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black text-blue-600">
                {uploadProgress.percentage}%
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">Synchronizing Telecom Ledger</h3>
              <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">Piping rows to MongoDB Atlas...</p>
            </div>

            {/* 🛠️ LIVE ELAPSED TIME TRACKER CHIP */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-gray-200 text-xs font-mono font-bold text-gray-700 shadow-inner">
              <svg className="w-3.5 h-3.5 text-gray-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Time Elapsed: {elapsedTime >= 60 ? `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s` : `${elapsedTime}s`}</span>
            </div>

            {/* REAL-TIME PROGRESS INDICATOR METER BAR SECTION */}
            <div className="w-full space-y-1.5">
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border shadow-inner flex">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm" 
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono font-semibold">
                <span>Processed: {uploadProgress.processed.toLocaleString()} accounts</span>
                <span>Total: {uploadProgress.total.toLocaleString()} rows</span>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 border border-amber-100 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Please do not close or reload this window
            </div>
          </div>
        </div>
      )}

    🛠️ REAL-TIME FULL-SCREEN INTERACTIVE PROCESSING LOADING BACKDROP OVERLAY
    {/* {isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-2xl border border-gray-100 max-w-sm w-full mx-4 text-center">
            {/* Animated SVG Loader Spinner 
            <div className="relative mb-4">
              <svg className="h-12 w-12 animate-spin text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.162 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-600 animate-pulse">
                DB
              </div>
            </div>
            
            <h3 className="text-base font-bold text-gray-900">Ingesting Spreadsheet Records</h3>
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
              Chunking data rows into batches, validating identities, and executing transaction pools to MongoDB Atlas cluster...
            </p>
            
            {/* Pulsing state tracker label indicator 
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 animate-pulse border border-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Please do not close this window
            </div>
          </div>
        </div>
      )} */}
  </div>

  
);

}
