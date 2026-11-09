// app/actions/twoFactor.ts
'use server';

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

// 🛠️ UTILITY: Initialise NodeMailer SMTP Transport layer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 🛠️ ACTION 1: Generate and Send 6-Digit Code via Email
export async function generateAndSend2FA(email: string) {
  try {
    // Generate a secure 6-digit token code
    const token = crypto.randomInt(100000, 999999).toString();
    
    // Set code expiration limit to 5 minutes
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    // Delete any active historical tokens for this email to prevent backlog clutter
    await prisma.twoFactorToken.deleteMany({ where: { email } });

    // Store token securely inside your MongoDB Atlas collection
    await prisma.twoFactorToken.create({
      data: { email, token, expires }
    });

    // Deliver token via secure SMTP email stream
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "🔒 Security Alert: Admin Portal 2FA Code",
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #1e293b; font-weight: 800;">Telecom Ingestion Hub</h2>
          <p style="font-size: 14px; color: #64748b;">A login request was initiated for your administrator profile. Use the verification code below to complete entry:</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: 900; letter-spacing: 4px; color: #2563eb;">${token}</span>
          </div>
          <p style="font-size: 11px; color: #94a3b8;">This code is strictly confidential and expires in 5 minutes. If you did not initiate this request, change your password phrase immediately.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("2FA Mailing Failure:", error);
    return { success: false, error: "Failed to deliver security token email." };
  }
}

// 🛠️ ACTION 2: Step-Up Validation Credential Flow Interceptor
export async function verifyTwoFactorToken(email: string, token: string) {
  const existingToken = await prisma.twoFactorToken.findUnique({
    where: { token }
  });

  if (!existingToken || existingToken.email !== email) {
    return { success: false, error: "Invalid verification code entered." };
  }

  const hasExpired = new Date() > existingToken.expires;
  if (hasExpired) {
    await prisma.twoFactorToken.delete({ where: { id: existingToken.id } });
    return { success: false, error: "Verification code has expired. Request a new code." };
  }

  // Clear token immediately upon validation success to prevent reuse exploits
  await prisma.twoFactorToken.delete({ where: { id: existingToken.id } });
  return { success: true };
}
