'use client';

import { AppProvider } from '@/lib/app-context';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProvider>{children}</AppProvider>;
}
