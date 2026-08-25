import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { Brand } from '@/components/Brand';

export type LoginMode = 'signin' | 'signup';

interface LoginProps {
  mode: LoginMode;
  setMode: (m: LoginMode) => void;
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
  error: string;
}

export const Login = ({
  mode,
  setMode,
  phone,
  setPhone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSignIn,
  onCreateAccount,
  error,
}: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isSignup = mode === 'signup';

  const handlePhoneChange = (raw: string) => {
    setPhone(raw.replace(/\D/g, '').slice(0, 10));
  };

  const submit = () => {
    if (isSignup) {
      if (password !== confirmPassword) return;
      onCreateAccount();
    } else {
      onSignIn();
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229)
      submit();
  };

  const confirmMismatch =
    isSignup && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <main className="flex min-h-screen justify-center bg-background px-5 pt-16 pb-10 sm:pt-24">
      <section className="w-full max-w-[380px]">
        <Brand />

        <h1 className="mt-8 text-[22px] leading-tight font-semibold tracking-tight text-foreground">
          {isSignup ? 'Create account' : 'Sign in'}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {isSignup
            ? 'Your mobile number is your account ID. Pick a password — you’ll use both to restore your expenses on any device.'
            : 'Enter your mobile number and password to access your expenses.'}
        </p>

        <div className="mt-5 inline-flex w-full rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`press h-8 flex-1 cursor-pointer rounded-md text-[12px] font-medium transition-colors ${
              !isSignup
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`press h-8 flex-1 cursor-pointer rounded-md text-[12px] font-medium transition-colors ${
              isSignup
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create account
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <label
            htmlFor="phone"
            className="label mb-1.5 block"
          >
            Mobile number
          </label>
          <div className="field-shell flex h-9 rounded-lg border border-border bg-background">
            <span className="font-mono-numbers flex shrink-0 items-center rounded-l-[inherit] border-r border-border px-2.5 text-[13px] text-muted-foreground">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={onEnter}
              placeholder="98765 43210"
              aria-label="10-digit Indian mobile number"
              className="font-mono-numbers h-full w-full rounded-r-[inherit] bg-transparent px-2.5 text-[13px] tracking-wide text-foreground outline-none placeholder:text-faint"
            />
          </div>

          <label
            htmlFor="password"
            className="label mt-3 mb-1.5 block"
          >
            Password
          </label>
          <div className="field-shell flex h-9 rounded-lg border border-border bg-background">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onEnter}
              placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
              aria-label="Password"
              className="h-full w-full rounded-l-[inherit] bg-transparent px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="flex shrink-0 cursor-pointer items-center rounded-r-[inherit] border-l border-border px-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-3.5" strokeWidth={1.9} />
              ) : (
                <Eye className="size-3.5" strokeWidth={1.9} />
              )}
            </button>
          </div>

          {isSignup && (
            <>
              <label
                htmlFor="confirm-password"
                className="label mt-3 mb-1.5 block"
              >
                Confirm password
              </label>
              <div
                className={`field-shell flex h-9 rounded-lg border bg-background ${
                  confirmMismatch ? 'border-destructive/60' : 'border-border'
                }`}
              >
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={onEnter}
                  placeholder="Type it again"
                  aria-label="Confirm password"
                  className="h-full w-full rounded-l-[inherit] bg-transparent px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="flex shrink-0 cursor-pointer items-center rounded-r-[inherit] border-l border-border px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showConfirm ? (
                    <EyeOff className="size-3.5" strokeWidth={1.9} />
                  ) : (
                    <Eye className="size-3.5" strokeWidth={1.9} />
                  )}
                </button>
              </div>
              {confirmMismatch && (
                <p className="mt-2 text-[12px] text-destructive">
                  Passwords don&rsquo;t match.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="mt-2 text-[12px] text-destructive">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={isSignup && confirmMismatch}
            className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSignup ? 'Create account' : 'Continue'}
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>

        {!isSignup && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] p-3">
            <Info
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              strokeWidth={2}
            />
            <p className="text-[12px] leading-relaxed text-foreground">
              <span className="font-medium">Already had an account?</span>{' '}
              Your password is your phone number — sign in once with that,
              then set a new password anytime in Settings.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
