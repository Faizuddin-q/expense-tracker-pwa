'use client';

import { AppInit } from '@/components/AppInit';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppInit>{children}</AppInit>;
}
