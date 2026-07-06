import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/", req.url)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/playground/:path*"],
}
