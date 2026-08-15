import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

export const POST = async () => {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
};
