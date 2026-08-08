'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import { Login } from '@/components/Login';
import { IncomeSetup } from '@/components/IncomeSetup';

export default function LoginPage() {
  const {
    userId,
    phone,
    setPhone,
    continueWithPhone,
    error,
    needsIncome,
    incomeDraft,
    setIncomeDraft,
    saveIncome,
    initializing,
  } = useApp();

  const router = useRouter();

  // If already logged in, redirect straight to home
  useEffect(() => {
    if (!initializing && userId && !needsIncome) {
      router.replace('/');
    }
  }, [initializing, userId, needsIncome, router]);

  if (initializing) {
    return <div className="min-h-screen bg-background" />;
  }

  if (needsIncome) {
    return (
      <IncomeSetup
        value={incomeDraft}
        setValue={setIncomeDraft}
        onSave={async () => {
          await saveIncome();
          router.replace('/');
        }}
        error={error}
      />
    );
  }

  return (
    <Login
      phone={phone}
      setPhone={setPhone}
      onContinue={async () => {
        await continueWithPhone();
      }}
      error={error}
    />
  );
}
