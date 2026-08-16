import type { Metadata } from 'next';
import { ThemeSync } from '@/components/ThemeSync';

export const metadata: Metadata = {
  title: 'Admin — Pocket',
  description: 'Manage every Pocket account from one dashboard.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}
