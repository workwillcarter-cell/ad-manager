import { google } from "googleapis"
import type { Readable } from "node:stream"
import { prisma } from "@/lib/prisma"

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

function makeOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  )
}

export function getDriveAuthUrl(redirectUri: string) {
  const client = makeOAuthClient(redirectUri)
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  })
}

export async function exchangeDriveCode(code: string, redirectUri: string) {
  const client = makeOAuthClient(redirectUri)
  const { tokens } = await client.getToken(code)
  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned. Revoke the app at myaccount.google.com/permissions and try again.")
  }
  await prisma.integrationToken.upsert({
    where: { provider: "DRIVE" },
    create: {
      provider: "DRIVE",
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  })
}

async function getAuthedDrive() {
  const token = await prisma.integrationToken.findUnique({ where: { provider: "DRIVE" } })
  if (!token) throw new Error("Google Drive not connected. Visit /setup to connect.")

  const client = makeOAuthClient(process.env.GOOGLE_REDIRECT_URI!)
  client.setCredentials({ refresh_token: token.refreshToken })
  return google.drive({ version: "v3", auth: client })
}

export function extractDriveFolderId(url: string): string | null {
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch) return folderMatch[1]
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]
  const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam) return idParam[1]
  return null
}

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  size: number
}

export async function listDriveFolderFiles(folderId: string): Promise<DriveFile[]> {
  const drive = await getAuthedDrive()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size)",
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: Number(f.size ?? 0),
  }))
}

export async function downloadDriveFile(fileId: string): Promise<Readable> {
  const drive = await getAuthedDrive()
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  )
  return res.data as Readable
}

export function getFileExtension(name: string): string {
  const m = name.match(/\.([^.]+)$/)
  return m ? m[1].toLowerCase() : "mp4"
}
