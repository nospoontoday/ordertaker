import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { BranchProvider } from '@/contexts/branch-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { ServiceWorkerInitializer } from '@/components/sw-initializer'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Order Taker App',
  description: 'Coffee shop order management system with offline support',
  generator: 'v0.app',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OrderTaker',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ServiceWorkerInitializer />
        <AuthProvider>
          <BranchProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </BranchProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
