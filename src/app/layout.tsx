import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import TrackingProvider from '@/components/TrackingProvider'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${playfair.variable} antialiased`}>
        <TrackingProvider />
        {children}
      </body>
    </html>
  )
}
