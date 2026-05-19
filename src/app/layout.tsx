import type { Metadata } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import './globals.css'
import TrackingProvider from '@/components/TrackingProvider'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Tienda Inteligente',
  description: 'Tu tienda online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${geist.variable} ${playfair.variable} antialiased`}>
        <TrackingProvider />
        {children}
      </body>
    </html>
  )
}
