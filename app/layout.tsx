import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { AppInit } from '@/components/AppInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pockett — Spend with clarity',
  description: 'A calm expense tracker for everyday spending — synced to your account.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pockett',
  },
  icons: {
    icon: [
      {
        url: '/pwa-icon.png',
        type: 'image/png',
      },
      {
        url: '/icon-white.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#18181b' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light bg-background">
      <body className="antialiased">
        <AppInit>{children}</AppInit>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
