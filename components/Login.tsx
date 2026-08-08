import { IndianRupee, Wifi } from 'lucide-react';

interface LoginProps {
  phone: string;
  setPhone: (v: string) => void;
  onContinue: () => void;
  error: string;
}

export const Login = ({ phone, setPhone, onContinue, error }: LoginProps) => {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border sm:p-10">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-2xs">
            <IndianRupee className="size-5" />
          </div>
          <div>
            <p className="font-bold tracking-tight text-foreground">Pocket</p>
            <p className="text-xs text-muted-foreground">Spend with clarity</p>
          </div>
        </div>
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Your private money space
          </p>
          <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-foreground text-balance">
            Start with your mobile number.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We use it as your account ID to restore your expenses on another
            device. No OTP is required for this setup.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mobile number
            <input
              autoFocus
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                )
                  onContinue();
              }}
              placeholder="+91 98765 43210"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && (
            <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
          )}
          <button
            onClick={onContinue}
            className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
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
