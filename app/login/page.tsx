'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useSyncStore } from '@/lib/sync-store';
import { Login, LoginMode } from '@/components/Login';
import { IncomeSetup } from '@/components/IncomeSetup';
import { HomeSkeleton } from '@/components/HomeSkeleton';

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
    authenticating,
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

  useEffect(() => {
    if (!initializing && userId && profileHydrated && !needsIncome) {
      router.replace('/');
    }
  }, [initializing, userId, profileHydrated, needsIncome, router]);

  if (userId && profileHydrated && needsIncome) {
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

  if (userId) {
    return <HomeSkeleton />;
  }

  if (initializing) {
    return <div className="min-h-screen bg-background" />;
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
      busy={authenticating}
      onSignIn={() => {
        void signIn();
      }}
      onCreateAccount={() => {
        void createAccount().then(() => setConfirmPassword(''));
      }}
      error={error}
    />
  );
}
