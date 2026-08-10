import { Wifi } from 'lucide-react';
import { Brand } from '@/components/Brand';

interface LoginProps {
  phone: string;
  setPhone: (v: string) => void;
  onContinue: () => void;
  error: string;
}

export const Login = ({ phone, setPhone, onContinue, error }: LoginProps) => {
  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border sm:p-10">
        <Brand />
        <div className="mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground">
            Start with your mobile number.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We use it as your account ID to restore your expenses on another
            device. No OTP is required for this setup.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Mobile number
            <div className="flex h-12 overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="flex shrink-0 items-center border-r border-input bg-muted/60 px-3 text-sm font-bold text-foreground">
                +91
              </span>
              <input
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
                className="font-mono-numbers h-full w-full bg-transparent px-3 text-sm font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </label>
          {error && (
            <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
          )}
          <button
            onClick={onContinue}
            className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Continue <Wifi className="size-4" />
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Use the same number on another device to restore your synced
            expenses.
          </p>
        </div>
      </section>
    </main>
  );
};
