import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDriveAuthUrl } from "@/lib/drive"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString()
  const authUrl = getDriveAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
