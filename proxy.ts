import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/", req.url)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/playground/:path*"],
}
