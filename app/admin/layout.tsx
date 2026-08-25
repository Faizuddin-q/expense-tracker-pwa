import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Pockett',
  description: 'Manage every Pockett account from one dashboard.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
