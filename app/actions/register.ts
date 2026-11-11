// app/actions/register.ts
'use server';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerAdminUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) return { success: false, error: "Missing required profile parameters." };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { success: false, error: "An account with this email is already registered." };

    // Hash security password phrases string variables safely using 10 encryption rounds
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER" // Standard authorization access level constraint configuration
      }
    });

    return { 
      success: true, 
      message: 'Account registered as standard USER. Please wait for an existing Admin to approve your account before accessing the dashboard.', 
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Registration failed." };
  }
}
