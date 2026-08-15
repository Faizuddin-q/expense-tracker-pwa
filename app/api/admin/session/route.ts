import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export const GET = async () => {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() });
};
