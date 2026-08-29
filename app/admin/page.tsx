'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

type AuthState = 'checking' | 'signed-out' | 'signed-in';

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' });
      const { data } = await res.json();
      setAuthState(data?.authenticated ? 'signed-in' : 'signed-out');
    } catch {
      setAuthState('signed-out');
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (authState === 'checking') {
    return <div className="min-h-screen bg-background" />;
  }

  if (authState === 'signed-out') {
    return <AdminLogin onSuccess={() => setAuthState('signed-in')} />;
  }

  return <AdminDashboard onSignedOut={() => setAuthState('signed-out')} />;
}
