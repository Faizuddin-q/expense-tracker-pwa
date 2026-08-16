import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { Brand } from '@/components/Brand';

interface LoginProps {
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onContinue: () => void;
  error: string;
}

export const Login = ({
  phone,
  setPhone,
  password,
  setPassword,
  onContinue,
  error,
}: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const handlePhoneChange = (raw: string) => {
    setPhone(raw.replace(/\D/g, '').slice(0, 10));
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-[380px]">
        <Brand />

        <h1 className="mt-8 text-[22px] leading-tight font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Your mobile number is your account ID. New here? Choose a password
          and this becomes your account. Use the same number and password on
          another device to restore your expenses.
        </p>

        <div className="mt-7 rounded-xl border border-border bg-card p-4">
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
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                )
                  onContinue();
              }}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                )
                  onContinue();
              }}
              placeholder="At least 6 characters"
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

          {error && (
            <p className="mt-2 text-[12px] text-destructive">{error}</p>
          )}

          <button
            onClick={onContinue}
            className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
          >
            Continue
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] p-3">
          <Info
            className="mt-0.5 size-3.5 shrink-0 text-primary"
            strokeWidth={2}
          />
          <p className="text-[12px] leading-relaxed text-foreground">
            <span className="font-medium">Already had an account?</span> Your
            password is your phone number — sign in once with that, then set
            a new password anytime in Settings.
          </p>
        </div>
      </section>
    </main>
  );
};
