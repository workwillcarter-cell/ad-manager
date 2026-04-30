import { Dropbox, DropboxAuth } from "dropbox"
import type { Readable } from "node:stream"
import { prisma } from "@/lib/prisma"

const SCOPES = [
  "files.metadata.read",
  "files.metadata.write",
  "files.content.read",
  "files.content.write",
]

function makeAuth() {
  return new DropboxAuth({
    clientId: process.env.DROPBOX_CLIENT_ID!,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
    fetch,
  })
}

export async function getDropboxAuthUrl(redirectUri: string): Promise<string> {
  const auth = makeAuth()
  const url = await auth.getAuthenticationUrl(
    redirectUri,
    undefined,
    "code",
    "offline",
    SCOPES,
    "none",
    false,
  )
  return String(url)
}

export async function exchangeDropboxCode(code: string, redirectUri: string) {
  const auth = makeAuth()
  const res = (await auth.getAccessTokenFromCode(redirectUri, code)) as {
    result?: { refresh_token?: string; access_token?: string; expires_in?: number }
  } & { refresh_token?: string; access_token?: string; expires_in?: number }
  const result = res.result ?? res
  if (!result.refresh_token) {
    throw new Error("No refresh token returned from Dropbox.")
  }
  await prisma.integrationToken.upsert({
    where: { provider: "DROPBOX" },
    create: {
      provider: "DROPBOX",
      refreshToken: result.refresh_token,
      accessToken: result.access_token ?? null,
      expiresAt: result.expires_in ? new Date(Date.now() + result.expires_in * 1000) : null,
    },
    update: {
      refreshToken: result.refresh_token,
      accessToken: result.access_token ?? null,
      expiresAt: result.expires_in ? new Date(Date.now() + result.expires_in * 1000) : null,
    },
  })
}

async function getAuthedDropbox(): Promise<Dropbox> {
  const token = await prisma.integrationToken.findUnique({ where: { provider: "DROPBOX" } })
  if (!token) throw new Error("Dropbox not connected. Visit /setup to connect.")

  return new Dropbox({
    clientId: process.env.DROPBOX_CLIENT_ID!,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
    refreshToken: token.refreshToken,
    fetch,
  })
}

export async function dropboxFolderExists(path: string): Promise<boolean> {
  const dbx = await getAuthedDropbox()
  try {
    await dbx.filesGetMetadata({ path })
    return true
  } catch (err: unknown) {
    const summary = (err as { error?: { error_summary?: string } })?.error?.error_summary ?? ""
    if (summary.startsWith("path/not_found")) return false
    throw err
  }
}

const SIMPLE_UPLOAD_LIMIT = 150 * 1024 * 1024
const SESSION_CHUNK_SIZE = 8 * 1024 * 1024

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function uploadStreamToDropbox(
  stream: Readable,
  destinationPath: string,
): Promise<void> {
  const dbx = await getAuthedDropbox()
  const buffer = await streamToBuffer(stream)
  const totalSize = buffer.length

  if (totalSize <= SIMPLE_UPLOAD_LIMIT) {
    await dbx.filesUpload({
      path: destinationPath,
      contents: buffer,
      mode: { ".tag": "add" },
      autorename: false,
    })
    return
  }

  let offset = 0
  const firstChunk = buffer.subarray(0, SESSION_CHUNK_SIZE)
  const startRes = await dbx.filesUploadSessionStart({ close: false, contents: firstChunk })
  const sessionId = startRes.result.session_id
  offset += firstChunk.length

  while (offset + SESSION_CHUNK_SIZE < totalSize) {
    const chunk = buffer.subarray(offset, offset + SESSION_CHUNK_SIZE)
    await dbx.filesUploadSessionAppendV2({
      cursor: { session_id: sessionId, offset },
      close: false,
      contents: chunk,
    })
    offset += chunk.length
  }

  const lastChunk = buffer.subarray(offset, totalSize)
  await dbx.filesUploadSessionFinish({
    cursor: { session_id: sessionId, offset },
    commit: { path: destinationPath, mode: { ".tag": "add" }, autorename: false },
    contents: lastChunk,
  })
}
