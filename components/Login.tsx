import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';

interface LoginProps {
  phone: string;
  setPhone: (v: string) => void;
  onContinue: () => void;
  error: string;
}

export const Login = ({ phone, setPhone, onContinue, error }: LoginProps) => {
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
          Your mobile number is your account ID. Use the same number on another
          device to restore your expenses. No OTP required.
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
              autoFocus
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
      </section>
    </main>
  );
};
