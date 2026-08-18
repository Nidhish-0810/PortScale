import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'PortScale — Deploy from GitHub Instantly',
    template: '%s | PortScale',
  },
  description: 'A self-hosted PaaS. Link your GitHub repo and get a live URL in minutes.',
  keywords: ['paas', 'deployment', 'docker', 'github', 'self-hosted'],
  openGraph: {
    title: 'PortScale',
    description: 'Deploy from GitHub. Get a live URL in minutes.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${playfair.variable} ${inter.variable}`}
    >
      <body>
        {/* Scanline effect */}
        <div className="scanline" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
