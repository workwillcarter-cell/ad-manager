import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

type SearchParams = Promise<{ connected?: string; error?: string }>

export default async function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CEO") redirect("/dashboard")

  const params = await searchParams
  const tokens = await prisma.integrationToken.findMany({
    select: { provider: true, updatedAt: true },
  })
  const driveConnected = tokens.find((t) => t.provider === "DRIVE")
  const dropboxConnected = tokens.find((t) => t.provider === "DROPBOX")

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Setup</h1>
        <p className="text-sm text-bloom-soft/80 mt-0.5">
          Connect Google Drive and Dropbox so the app can transfer finished ads automatically.
        </p>
      </div>

      {params.connected === "drive" && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-100 border border-green-200 text-green-800 text-sm">
          Google Drive connected.
        </div>
      )}
      {params.connected === "dropbox" && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-100 border border-green-200 text-green-800 text-sm">
          Dropbox connected.
        </div>
      )}
      {params.error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-100 border border-red-200 text-red-800 text-sm">
          {params.error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <IntegrationRow
          title="Google Drive"
          subtitle="Lets the app read editor folders and download finished ad files."
          connected={!!driveConnected}
          updatedAt={driveConnected?.updatedAt}
          startUrl="/api/auth/google/start"
        />
        <div className="border-t border-gray-100" />
        <IntegrationRow
          title="Dropbox"
          subtitle="Lets the app upload renamed files into your /Ads folder."
          connected={!!dropboxConnected}
          updatedAt={dropboxConnected?.updatedAt}
          startUrl="/api/auth/dropbox/start"
        />
      </div>
    </div>
  )
}

function IntegrationRow({
  title,
  subtitle,
  connected,
  updatedAt,
  startUrl,
}: {
  title: string
  subtitle: string
  connected: boolean
  updatedAt?: Date
  startUrl: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-5">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {connected ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Connected
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Not connected
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        {connected && updatedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Connected {new Date(updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <a
        href={startUrl}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-bloom-dark text-white hover:bg-bloom transition-colors"
      >
        {connected ? "Reconnect" : "Connect"}
      </a>
    </div>
  )
}
