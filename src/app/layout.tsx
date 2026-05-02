import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BloomaCare Ad Manager",
  description: "Creative project manager for BloomaCare ads",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-bloom-dark min-h-screen`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
