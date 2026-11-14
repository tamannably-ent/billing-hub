// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Request maximum server duration on Vercel

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  // Create a streaming readable response layer channel back to the browser
  const customStream = new ReadableStream({
    async start(controller) {
      try {
        const { jsonData } = await req.json();
        if (!jsonData || jsonData.length === 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Empty spreadsheet payload context.' }) + '\n'));
          controller.close();
          return;
        }

        // 1. In-memory data compilation grouping loop
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
            ftthSpreadsheetMap.set(billingAccountNum, { baseRow: row, newRecords: [] });
          }
          ftthSpreadsheetMap.get(billingAccountNum)!.newRecords.push(newBillingRecord);
        }

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
            const currentRecordsMap = new Map<string, any>(
              (existingSub.billingRecords || []).map((rec: any) => [`${rec.commissionMonth}_${rec.invoiceNum}`, rec])
            );
            group.newRecords.forEach((freshRec) => {
              const uniqueKey = `${freshRec.commissionMonth}_${freshRec.invoiceNum}`;
              currentRecordsMap.set(uniqueKey, freshRec);
            });

            updates.push({
              id: existingSub.id,
              billingAccountNum,
              telephoneNum: String(row['TELEPHONE NUM'] || ''),
              bbUserId: String(row['BB USER ID'] || ''),
              serviceType: String(row['SERVICE TYPE'] || ''),
              oltIpAddress: String(row['OLT IP ADDRESS'] || ''),
              maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE'] || ''),
              billingRecords: Array.from(currentRecordsMap.values())
            });
          } else {
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

        // 🛠️ 2. CONCURRENT PARALLEL SAVE WITH LIVE PROGRESS CHUNK STREAMING
        const CHUNK_SIZE = 120;
        let cumulativeProcessed = 0;
        const totalItemsCount = creates.length + updates.length;

        // Process creation batches in parallel groups of 100 rows
        for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
          const chunk = creates.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(data => prisma.subscriber.create({ data })));
          
          cumulativeProcessed += chunk.length;
          // Pipe live percentage token map down to the client layout immediately
          controller.enqueue(encoder.encode(JSON.stringify({ processed: cumulativeProcessed, total: totalItemsCount }) + '\n'));
        }

        // Process update modifications in parallel groups of 100 rows
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

          cumulativeProcessed += chunk.length;
          controller.enqueue(encoder.encode(JSON.stringify({ processed: cumulativeProcessed, total: totalItemsCount }) + '\n'));
        }

        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: err.message || 'Transaction aborted.' }) + '\n'));
        controller.close();
      }
    }
  });

  return new Response(customStream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' }
  });
}
