// middleware.ts
import { WITH_AUTH, withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    
    // 🛠️ ADMIN CHECKPOINT FIREWALL: Block users even if logged in if they don't hold the admin token role
    if (req.nextUrl.pathname.startsWith("/dashboard") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?error=Unauthorized", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Returns true only if a valid session token exists
    },
  }
);

// Protect your main dashboard folder paths and internal routing components
export const config = { matcher: ["/dashboard/:path*"] };
