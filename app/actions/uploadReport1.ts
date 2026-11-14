// app/actions/uploadReport.ts (Part 1 - Bulk Initialization)
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

// Reconstructs string variations like '202602' or standard formatting into clear display values
function parseLeasedLineMonth(chargeMonth: any): string {
    const str = String(chargeMonth || '').trim();
    if (str.length === 6) {
      const year = str.substring(0, 4);
      const monthNum = parseInt(str.substring(4, 6), 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${months[monthNum - 1]}-${year}`; // Returns perfectly structured format e.g., 'FEB-2026'
    }
    return str || 'UNKNOWN';
}



// export async function uploadReportData(jsonData: any[]) {
//   try {
//     let matchedCount = 0;
//     let upsertedCount = 0;

//     // 1. Pre-fetch all subscriber documents in ONE single query to avoid loops
//     const allBillingAccountNums = jsonData.map(row => String(row['BILLING ACCC NUM']));
//     const existingSubscribers = await prisma.subscriber.findMany({
//       where: { billingAccountNum: { in: allBillingAccountNums } }
//     });

//     // Convert to a lightning-fast dictionary lookup map
//     const subscriberMap = new Map(existingSubscribers.map(s => [s.billingAccountNum, s]));

//     // 2. Process records in memory without hitting the database repeatedly
//     const updates = [];
//     const creates = [];

//     for (const row of jsonData) {
//       const billingAccountNum = String(row['BILLING ACCC NUM']);
//       const commissionMonth = String(row['COMMISSION MONTH']);
//       const invoiceNum = String(row['INVOICE NUM']);
//       const totalInvoiceAmount = parseFloat(row['TOTAL INVOICE AMOUNT']) || 0;
//       const revenueShareAmtGenerated = row['REVENUE SHARE AMT GENERATED'] ? parseFloat(row['REVENUE SHARE AMT GENERATED']) : null;

//       const newBillingRecord = {
//         commissionMonth,
//         invoiceNum,
//         invoiceDate: new Date(row['INVOICE DATE']),
//         totalInvoiceAmount,
//         paymentStatus: String(row['PAYMENT STATUS']),
//         revenueShareAmtGenerated,
//         remarks: String(row['REMARKS'] || '-'),
//       };

//       const existingSub = subscriberMap.get(billingAccountNum);

//       if (existingSub) {
//         matchedCount++;
//         // Exclude duplicate invoice numbers to keep the array clean
//         const cleanRecords = (existingSub.billingRecords || []).filter(
//           (rec: any) => rec.invoiceNum !== invoiceNum
//         );

//         updates.push({
//           billingAccountNum,
//           telephoneNum: String(row['TELEPHONE NUM']),
//           bbUserId: String(row['BB USER ID']),
//           serviceType: String(row['SERVICE TYPE']),
//           oltIpAddress: String(row['OLT IP ADDRESS']),
//           maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE']),
//           billingRecords: [...cleanRecords, newBillingRecord]
//         });
//       } else {
//         upsertedCount++;
//         creates.push({
//           id: crypto.randomBytes(12).toString('hex'), // Valid MongoDB 24-char ObjectId string format
//           billingAccountNum,
//           telephoneNum: String(row['TELEPHONE NUM']),
//           bbUserId: String(row['BB USER ID']),
//           serviceType: String(row['SERVICE TYPE']),
//           serviceStartDate: new Date(row['SERVICE START DATE']),
//           zone: String(row['ZONE']),
//           circle: String(row['CIRCLE']),
//           ba: String(row['BA']),
//           ssa: String(row['SSA']),
//           oltIpAddress: String(row['OLT IP ADDRESS']),
//           maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE']),
//           billingRecords: [newBillingRecord]
//         });
//       }
//     }
//     // app/actions/uploadReport.ts (Part 2 - Chunked Database Execution)
//     // 3. Save updates to the database using controlled parallel chunking
//     const CHUNK_SIZE = 50;
    
//     // Process new subscriber registrations
//     for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
//       const chunk = creates.slice(i, i + CHUNK_SIZE);
//       await Promise.all(
//         chunk.map(data => prisma.subscriber.create({ data }))
//       );
//     }

//     // Process profile modifications and invoice additions
//     for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
//       const chunk = updates.slice(i, i + CHUNK_SIZE);
//       await Promise.all(
//         chunk.map(item => prisma.subscriber.update({
//           where: { telephoneNum: item.telephoneNum },
//           data: {
//             telephoneNum: item.telephoneNum,
//             bbUserId: item.bbUserId,
//             serviceType: item.serviceType,
//             oltIpAddress: item.oltIpAddress,
//             maintFranchiseeCode: item.maintFranchiseeCode,
//             billingRecords: item.billingRecords
//           }
//         }))
//       );
//     }

//     // Clear caches and tell Next.js to refresh the live layout grid view
//     revalidatePath('/dashboard');

//     return { 
//       success: true, 
//       message: `Processed ${jsonData.length} spreadsheet records. (Profiles created: ${upsertedCount}, Profiles updated: ${matchedCount})` 
//     };

//   } catch (error: any) {
//     console.error('Prisma MongoDB Bulk Processing Error:', error);
//     return { 
//       success: false, 
//       error: error.message || 'An unexpected cluster timeout error occurred during bulk imports.' 
//     };
//   }
// }

export async function uploadBothData(jsonData: any[]) {
    try {
      if (!jsonData || jsonData.length === 0) return { success: false, error: 'Empty payload context.' };

      // Inspects the very first row item of the sheet array to look up layout types accurately
      const sampleRow = jsonData[0];
  
      const isLeasedLineReport = sampleRow && ('LC ID' in sampleRow || 'ACC NUM' in sampleRow || 'SERVICE SUBTYPE' in sampleRow);
  
      if (isLeasedLineReport) {
        // 🛠️ FIX 1: PIVOT MAP CHANGED TO GROUP EXCLUSIVELY BY LC ID (TELEPHONE COLUMNS REMOVED)
        const spreadsheetMap = new Map<string, { baseRow: any; records: Map<string, any> }>();
  
        for (const row of jsonData) {
          const lcId = String(row['LC ID'] || '').trim();
          if (!lcId) continue; // Skip lines missing a valid Circuit ID parameter flag
  
          const commissionMonth = parseLeasedLineMonth(row['CHARGE MONTH']);
          const invoiceNum = String(row['LAST INV NUM'] || '').trim();
          const lcEnd = String(row['LC END'] || 'END_A').trim(); // Capture End

        //   Composite map key (combines month + invoice)
          const compositeRecordKey = `${commissionMonth}_${invoiceNum}_${lcEnd}`

          // Safely parse date strings without breaking into 'Invalid Date' formats
          const rawInvDate = row['LAST INV DATE'];
          const invoiceDate = rawInvDate ? new Date(rawInvDate) : new Date();
          
          const newRecord = {
            commissionMonth,
            invoiceNum,
            invoiceDate: isNaN(invoiceDate.getTime()) ? new Date() : invoiceDate,
            totalInvoiceAmount: parseFloat(row['LAST INV TOTAL MNY']) || 0,
            paymentStatus: String(row['LAST BILL PAID STATUS'] || 'BILL_PENDING'),
            revenueShareAmtGenerated: parseFloat(row['FINAL COMM AMT']) || 0,
            remarks: `{${lcEnd}] ${String(row['REMARKS'] || '-')}`,
          };
  
          if (!spreadsheetMap.has(lcId)) {
            spreadsheetMap.set(lcId, { 
              baseRow: row, 
              records: new Map<string, any>() 
            });
          }
  
        //   const accountGroup = spreadsheetMap.get(lcId)!;
        //   accountGroup.records.set(invoiceNum, newRecord);
          spreadsheetMap.get(lcId)!.records.set(compositeRecordKey, newRecord)
        }
        // 🛠️ FIX 2: PRE-FETCH DATABASE HANDSHAKE COMPARES TARGETED LCID KEYS ONLY
      const targetedLcIds = Array.from(spreadsheetMap.keys());
      const existingLLs = await prisma.leasedLine.findMany({
        where: { lcId: { in: targetedLcIds } }
      });
      const dbMap = new Map(existingLLs.map(l => [l.lcId, l]));

      const updates = [];
      const creates = [];

      for (const [lcId, group] of spreadsheetMap.entries()) {
        const row = group.baseRow;
        const freshRecordsArray = Array.from(group.records.values());
        const existingItem = dbMap.get(lcId);

        const rawStartDat = row['BILLING START DAT'];
        const serviceStartDate = rawStartDat ? new Date(rawStartDat) : new Date();

        if (existingItem) {
        //   const freshInvoiceNums = new Set(
        //     freshRecordsArray.map(r => `${r.commissionMonth}_${r.invoiceNum}`));

          // 🛠️ FIX 2: Generate tracking set using the extended composite keys
          const freshCompositeKeys = new Set(
            freshRecordsArray.map(r => {
              // Extract the embedded endpoint tag back out of the remarks string text
              const match = r.remarks.match(/^\[(.*?)\]/);
              const endTag = match ? match[1] : 'END_A';
              return `${r.commissionMonth}_${r.invoiceNum}_${endTag}`;
            })
          );

        //   const historicFiltered = (existingItem.billingRecords || []).filter(
        //     r => !freshInvoiceNums.has(`${r.commissionMonth}_${r.invoiceNum}`)
        //   );
          // 🛠️ FIX 3: Filter safely using the Month + Invoice + Endpoint compound matrix key
          const historicFiltered = (existingItem.billingRecords || []).filter((r) => {
            const match = (r.remarks || '').match(/^\[(.*?)\]/);
            const endTag = match ? match[1] : 'END_A';
            return !freshCompositeKeys.has(`${r.commissionMonth}_${r.invoiceNum}_${endTag}`);
          });

          updates.push({
            lcId: lcId,
            billingAccountNum: String(row['ACC NUM'] || ''),
            serviceSubtype: String(row['SERVICE SUBTYPE'] || ''),
            bandwidth: String(row['BANDWIDTH'] || ''),
            oltIpAddress: String(row['OLT_IP'] || '-'),
            maintFranchiseeCode: String(row['MAINT FRAN CODE'] || ''),
            billingRecords: [...historicFiltered, ...freshRecordsArray]
          });
        } else {
          creates.push({
            id: crypto.randomBytes(12).toString('hex'),
            lcId: lcId,
            billingAccountNum: String(row['ACC NUM'] || ''),
            serviceSubtype: String(row['SERVICE SUBTYPE'] || ''),
            bandwidth: String(row['BANDWIDTH'] || ''),
            serviceStartDate: isNaN(serviceStartDate.getTime()) ? new Date() : serviceStartDate,
            zone: String(row['ZONE'] || ''),
            circle: String(row['CIRCLE'] || ''),
            ba: String(row['BA'] || 'BLY'),
            ssa: String(row['SSA'] || 'BLY'),
            oltIpAddress: String(row['OLT_IP'] || '-'),
            maintFranchiseeCode: String(row['MAINT FRAN CODE'] || ''),
            billingRecords: freshRecordsArray
          });
        }
      }

      // Parallel operational batch execution arrays pushing cleanly to Atlas
      const CHUNK_SIZE = 100;
      for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
        const chunk = creates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(data => prisma.leasedLine.create({ data })));
      }

      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(item => prisma.leasedLine.update({
          where: { lcId: item.lcId }, // Target update operations using matching unique circuit flags
          data: {
            billingAccountNum: item.billingAccountNum,
            serviceSubtype: item.serviceSubtype,
            bandwidth: item.bandwidth,
            oltIpAddress: item.oltIpAddress,
            maintFranchiseeCode: item.maintFranchiseeCode,
            billingRecords: item.billingRecords
          }
        })));
      }
    } else {
      // ----------------------------------------------------
      // 📊 TARGET: Standalone FTTH STORAGE INGESTION ENGINE (ALL ROWS APPENDED)
      // ----------------------------------------------------
      try {
        let matchedCount = 0;
        let upsertedCount = 0;

        // 🛠️ STEP 1: GROUP SPREADSHEET ROWS DIRECTLY BY ACCOUNT NUMBER WITHOUT DROPPING DUPLICATES
        const ftthSpreadsheetMap = new Map<string, { baseRow: any; newRecords: any[] }>();

        for (const row of jsonData) {
          const billingAccountNum = String(row['BILLING ACCC NUM'] || '').trim();
          if (!billingAccountNum) continue;

          const commissionMonth = String(row['COMMISSION MONTH'] || '').trim();
          const invoiceNum = String(row['INVOICE NUM'] || '').trim();
          const totalInvoiceAmount = parseFloat(row['TOTAL INVOICE AMOUNT']) || 0;
          const revenueShareAmtGenerated = row['REVENUE SHARE AMT GENERATED'] ? parseFloat(row['REVENUE SHARE AMT GENERATED']) : null;

          const newBillingRecord = {
            commissionMonth,
            invoiceNum,
            invoiceDate: new Date(row['INVOICE DATE'] || Date.now()),
            totalInvoiceAmount,
            paymentStatus: String(row['PAYMENT STATUS'] || 'FULLY PAID'),
            revenueShareAmtGenerated,
            remarks: String(row['REMARKS'] || '-'),
          };

          if (!ftthSpreadsheetMap.has(billingAccountNum)) {
            ftthSpreadsheetMap.set(billingAccountNum, {
              baseRow: row,
              newRecords: []
            });
          }

          // 🛠️ FIX: Push every row directly. No composite keys, no overwriting.
          ftthSpreadsheetMap.get(billingAccountNum)!.newRecords.push(newBillingRecord);
        }

        // 2. Fetch existing profiles using Billing Account Numbers
        const allAccountNums = Array.from(ftthSpreadsheetMap.keys());
        const existingSubscribers = await prisma.subscriber.findMany({
          where: { billingAccountNum: { in: allAccountNums } }
        });
        const subscriberMap = new Map(existingSubscribers.map(s => [s.billingAccountNum, s]));

        const updates = [];
        const creates = [];

        for (const [billingAccountNum, group] of ftthSpreadsheetMap.entries()) {
          const row = group.baseRow;
          const existingSub = subscriberMap.get(billingAccountNum);

          if (existingSub) {
            matchedCount++;

            // Create a map of existing records by month Month_invoice
            const currentRecordsMap = new Map<string, any>(
              (existingSub.billingRecords || []).map((rec: any) => [`${rec.commissionMonth}_${rec.invoiceNum}`, rec])
            );

            // 🛠️ Overwrite or Append incoming records interactively
            group.newRecords.forEach((freshRec) => {
              const uniqueKey = `${freshRec.commissionMonth}_${freshRec.invoiceNum}`;
              // If it matches an existing entry, it overwrites it (correcting data), otherwise it appends it
              currentRecordsMap.set(uniqueKey, freshRec);
            });

            // Convert the deduplicated map back into a flat array structure
            const mergedBillingRecords = Array.from(currentRecordsMap.values());


            // 🛠️ FIX: Append all new entries directly onto historical logs without filtering
            updates.push({
              id: existingSub.id,
              billingAccountNum,
              telephoneNum: String(row['TELEPHONE NUM'] || ''),
              bbUserId: String(row['BB USER ID'] || ''),
              serviceType: String(row['SERVICE TYPE'] || ''),
              oltIpAddress: String(row['OLT IP ADDRESS'] || ''),
              maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE'] || ''),
              billingRecords: mergedBillingRecords
            });
          } else {
            upsertedCount++;
            creates.push({
              id: crypto.randomBytes(12).toString('hex'),
              billingAccountNum,
              telephoneNum: String(row['TELEPHONE NUM'] || ''),
              bbUserId: String(row['BB USER ID'] || ''),
              serviceType: String(row['SERVICE TYPE'] || ''),
              serviceStartDate: new Date(row['SERVICE START DATE'] || Date.now()),
              zone: String(row['ZONE'] || 'SZ'),
              circle: String(row['CIRCLE'] || 'KT'),
              ba: String(row['BA'] || 'BLY'),
              ssa: String(row['SSA'] || 'BLY'),
              oltIpAddress: String(row['OLT IP ADDRESS'] || ''),
              maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE'] || ''),
              billingRecords: group.newRecords
            });
          }
        }

        // 3. Save chunk transactions to the database safely
        const CHUNK_SIZE = 50;
        for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
          const chunk = creates.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(data => prisma.subscriber.create({ data })));
        }

        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
          const chunk = updates.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(item => prisma.subscriber.update({
            where: { id: item.id },
            data: {
              billingAccountNum: item.billingAccountNum,
              telephoneNum: item.telephoneNum,
              bbUserId: item.bbUserId,
              serviceType: item.serviceType,
              oltIpAddress: item.oltIpAddress,
              maintFranchiseeCode: item.maintFranchiseeCode,
              billingRecords: item.billingRecords
            }
          })));
        }
      } catch (error: any) {
        console.error('Prisma Bulk Upload Error:', error);
        return { success: false, error: error.message || 'An insertion error occurred.' };
      }
    }


  
      revalidatePath('/dashboard');
      return { success: true, message: `Successfully synchronized ${jsonData.length} rows to MongoDB Atlas.` };
    } catch (error: any) {
      console.error('Database Sync Failure:', error);
      return { success: false, error: error.message || 'Data stream broken.' };
    }
  }

export async function deleteAllRecords() {
    try {
      // MongoDB drops all documents and their embedded array logs instantly
      const result = await prisma.subscriber.deleteMany({});
      
      // Purge the local Next.js cache so the dashboard immediately shows 0 records
      revalidatePath('/dashboard');
      
      return { 
        success: true, 
        message: `Successfully wiped all records from the database. Total removed: ${result.count}` 
      };
    } catch (error: any) {
      console.error('Failed to clear MongoDB Collection:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred while wiping data.' 
      };
    }
  }