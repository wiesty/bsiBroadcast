import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'BSI Broadcast',
  description: 'BSI WID Security Advisory Monitor',
  icons: {
    icon: '/brudi.png',
    apple: '/brudi.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="app-layout h-full flex" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <Sidebar />
        <main className="app-main flex-1 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
