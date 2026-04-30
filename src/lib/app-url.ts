export function getCanonicalAppUrl(): string {
  const explicit = process.env.NEXTAUTH_URL
  if (explicit) return explicit.replace(/\/$/, "")
  if (process.env.VERCEL_ENV === "production") {
    return "https://bloomacare-creative.vercel.app"
  }
  return "http://localhost:3000"
}
