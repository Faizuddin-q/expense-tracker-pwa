'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useSyncStore } from '@/lib/sync-store';
import { Login, LoginMode } from '@/components/Login';
import { IncomeSetup } from '@/components/IncomeSetup';

export default function LoginPage() {
  const {
    userId,
    phone,
    setPhone,
    password,
    setPassword,
    signIn,
    createAccount,
    error,
    initializing,
  } = useAuthStore();
  const {
    needsIncome,
    incomeDraft,
    setIncomeDraft,
    budgetDraft,
    setBudgetDraft,
    completeOnboarding,
    skipOnboarding,
  } = useProfileStore();
  const profileHydrated = useSyncStore((s) => s.profileHydrated);

  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('signin');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      mode={mode}
      setMode={(m) => {
        setMode(m);
        setPassword('');
        setConfirmPassword('');
      }}
      phone={phone}
      setPhone={setPhone}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      onSignIn={async () => {
        await signIn();
      }}
      onCreateAccount={async () => {
        await createAccount();
        setConfirmPassword('');
      }}
      error={error}
    />
  );
}
