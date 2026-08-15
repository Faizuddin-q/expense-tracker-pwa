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
    password,
    setPassword,
    continueWithPhone,
    error,
    needsIncome,
    profileHydrated,
    incomeDraft,
    setIncomeDraft,
    budgetDraft,
    setBudgetDraft,
    completeOnboarding,
    skipOnboarding,
    initializing,
  } = useApp();

  const router = useRouter();

  // If already logged in, redirect straight to home
  useEffect(() => {
    if (!initializing && userId && profileHydrated && !needsIncome) {
      router.replace('/');
    }
  }, [initializing, userId, profileHydrated, needsIncome, router]);

  if (initializing || (userId && !profileHydrated)) {
    return <div className="min-h-screen bg-background" />;
  }

  // Already signed in — about to redirect home via the effect above. Render
  // a blank placeholder instead of flashing the sign-in form.
  if (userId && profileHydrated && !needsIncome) {
    return <div className="min-h-screen bg-background" />;
  }

  if (needsIncome) {
    return (
      <IncomeSetup
        income={incomeDraft}
        setIncome={setIncomeDraft}
        budget={budgetDraft}
        setBudget={setBudgetDraft}
        onContinue={async () => {
          await completeOnboarding();
          router.replace('/');
        }}
        onSkip={async () => {
          await skipOnboarding();
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
      password={password}
      setPassword={setPassword}
      onContinue={async () => {
        await continueWithPhone();
      }}
      error={error}
    />
  );
}
