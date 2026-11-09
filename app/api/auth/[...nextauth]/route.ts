// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTwoFactorToken } from "@/app/actions/twoFactor";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "ADMIN", // Elevates Google users to admin automatically on registration
        };
      },
    }),
    CredentialsProvider({
      name: "2FA_Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        code: { type: "text" },
        isTwoFactorPass: { type: "text" } // Custom string flag 'true' or 'false'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials payload context.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("No administrator profile linked to this email address.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          throw new Error("Incorrect administrative security password phrase.");
        }

        // 🛠️ IF THIS IS JUST THE FIRST PHASE: Pass user validation back safely without logging in
        if (credentials.isTwoFactorPass !== "true") {
          return user; 
        }

        // 🛠️ IF THIS IS THE SECOND PHASE: Run deep 2FA validation check
        const twoFactorCheck = await verifyTwoFactorToken(credentials.email, credentials.code || "");
        if (!twoFactorCheck.success) {
          throw new Error(twoFactorCheck.error || "Authentication rejected.");
        }

        return user;
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    }
  },
  pages: {
    signIn: "/login", // Custom styled login interface route redirection pointer
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
