export type ProfileResponse = {
  monthlyIncome: number | null;
  monthlyBudget: number | null;
  hideAmounts: boolean | null;
  onboardingComplete: boolean;
  categories: unknown[];
  name: string | null;
  theme: 'dark' | 'light' | null;
  cycleStartDay: number | null;
};

export const toProfileResponse = (
  profile: Record<string, unknown> | null
): ProfileResponse => ({
  monthlyIncome:
    typeof profile?.monthlyIncome === 'number' ? profile.monthlyIncome : null,
  monthlyBudget:
    typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : null,
  hideAmounts:
    typeof profile?.hideAmounts === 'boolean' ? profile.hideAmounts : null,
  onboardingComplete: profile?.onboardingComplete === true,
  categories: Array.isArray(profile?.categories) ? profile.categories : [],
  name: typeof profile?.name === 'string' ? profile.name : null,
  theme:
    profile?.theme === 'dark' || profile?.theme === 'light'
      ? profile.theme
      : null,
  cycleStartDay:
    typeof profile?.cycleStartDay === 'number' &&
    profile.cycleStartDay >= 1 &&
    profile.cycleStartDay <= 31
      ? profile.cycleStartDay
      : null,
});
