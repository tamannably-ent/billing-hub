// app/actions/uploadReport.ts
'use server';

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto'; // 1. Import Node's built-in crypto utility
import { prisma } from '@/lib/prisma';
// const prisma = new PrismaClient();
import { revalidatePath } from 'next/cache';

export async function uploadReportData(jsonData: any[]) {
  try {
    let matchedCount = 0;
    let upsertedCount = 0;

    for (const row of jsonData) {
      const billingAccountNum = String(row['BILLING ACCC NUM']);
      const commissionMonth = String(row['COMMISSION MONTH']);
      const invoiceNum = String(row['INVOICE NUM']);
      
      const totalInvoiceAmount = parseFloat(row['TOTAL INVOICE AMOUNT']) || 0;
      const revenueShareAmtGenerated = row['REVENUE SHARE AMT GENERATED'] ? parseFloat(row['REVENUE SHARE AMT GENERATED']) : null;

      const newBillingRecord = {
        commissionMonth,
        invoiceNum,
        invoiceDate: new Date(row['INVOICE DATE']),
        totalInvoiceAmount,
        paymentStatus: String(row['PAYMENT STATUS']),
        revenueShareAmtGenerated,
        remarks: String(row['REMARKS'] || '-'),
      };

      const existingSubscriber = await prisma.subscriber.findUnique({
        where: { billingAccountNum },
      });

      if (existingSubscriber) {
        matchedCount++;
        
        const filteredRecords = (existingSubscriber.billingRecords || []).filter(
          (rec) => rec.invoiceNum !== invoiceNum
        );

        await prisma.subscriber.update({
          where: { billingAccountNum },
          data: {
            telephoneNum: String(row['TELEPHONE NUM']),
            bbUserId: String(row['BB USER ID']),
            serviceType: String(row['SERVICE TYPE']),
            oltIpAddress: String(row['OLT IP ADDRESS']),
            maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE']),
            billingRecords: [...filteredRecords, newBillingRecord],
          },
        });
      } else {
        upsertedCount++;
        
        // 2. Add a generated string ID to map directly to MongoDB's internal _id layout
        await prisma.subscriber.create({
          data: {
            id: crypto.randomBytes(12).toString('hex'), // Generates a valid 24-character hex string matching an ObjectId format
            billingAccountNum,
            telephoneNum: String(row['TELEPHONE NUM']),
            bbUserId: String(row['BB USER ID']),
            serviceType: String(row['SERVICE TYPE']),
            serviceStartDate: new Date(row['SERVICE START DATE']),
            zone: String(row['ZONE']),
            circle: String(row['CIRCLE']),
            ba: String(row['BA']),
            ssa: String(row['SSA']),
            oltIpAddress: String(row['OLT IP ADDRESS']),
            maintFranchiseeCode: String(row['MAINT FRANCHISEE CODE']),
            billingRecords: [newBillingRecord],
          },
        });
      }
    }

    return { 
      success: true, 
      message: `Processed ${jsonData.length} items. (Updated profiles: ${matchedCount}, Added profiles: ${upsertedCount})` 
    };

  } catch (error: any) {
    console.error('Prisma MongoDB Sync Error:', error);
    return { success: false, error: error.message || 'An error occurred uploading records to Atlas.' };
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