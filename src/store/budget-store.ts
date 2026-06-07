import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MultiFundSnapshot } from "../lib/funds-model";
import { getInitialSnapshot, funds } from "../lib/funds-model";
import {
  calculateMultiFundBalance,
  setFundExpenditure,
  setFundRevenue,
  setLevers,
  multiFundToLegacy,
  legacyToMultiFund,
} from "../lib/budget-engine";
import { validateUtilityCap } from "../lib/fund-rules-engine";
import type { BudgetSnapshot } from "../lib/budget-data";
import { getInitialSnapshot as getLegacyInitial } from "../lib/budget-data";

export type AppStep = "welcome" | "receipt" | "priorities" | "explore" | "forecast" | "review" | "share";
export type ViewMode = "guided" | "expert";

interface BudgetStore {
  snapshot: MultiFundSnapshot;
  activeFundId: string;
  activeCategoryId: string | null;
  step: AppStep;
  viewMode: ViewMode;
  onboardingDone: boolean;
  lastViolation: string | null;
  showForecast: boolean;
  showCompare: boolean;

  setFund: (id: string) => void;
  setCategory: (id: string | null) => void;
  setStep: (step: AppStep) => void;
  setViewMode: (mode: ViewMode) => void;
  completeOnboarding: () => void;
  updateExpenditure: (fundId: string, expId: string, amount: number) => void;
  applyGeneralFundAllocation: (amounts: Record<string, number>) => void;
  updateRevenue: (fundId: string, revId: string, amount: number) => void;
  updateLevers: (levers: Partial<MultiFundSnapshot["levers"]>) => void;
  reset: () => void;
  loadSnapshot: (snapshot: BudgetSnapshot | MultiFundSnapshot) => void;
  setShareMeta: (title: string, authorName?: string) => void;
  clearViolation: () => void;
  setShowForecast: (show: boolean) => void;
  setShowCompare: (show: boolean) => void;
  getLegacySnapshot: () => BudgetSnapshot;
}

function checkViolations(snapshot: MultiFundSnapshot): string | null {
  const utilityViolation = validateUtilityCap(snapshot.levers);
  if (utilityViolation) return utilityViolation.message;
  return null;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      snapshot: getInitialSnapshot(),
      activeFundId: "general-fund",
      activeCategoryId: null,
      step: "welcome",
      viewMode: "guided",
      onboardingDone: false,
      lastViolation: null,
      showForecast: false,
      showCompare: false,

      setFund: (id) => set({ activeFundId: id, activeCategoryId: null }),
      setCategory: (id) => set({ activeCategoryId: id }),
      setStep: (step) => set({ step }),
      setViewMode: (mode) => set({ viewMode: mode }),
      completeOnboarding: () => set({ onboardingDone: true, step: "explore" }),
      setShowForecast: (show) => set({ showForecast: show }),
      setShowCompare: (show) => set({ showCompare: show }),

      updateExpenditure: (fundId, expId, amount) => {
        const next = setFundExpenditure(get().snapshot, fundId, expId, amount);
        set({ snapshot: next, lastViolation: checkViolations(next) });
      },

      applyGeneralFundAllocation: (amounts) => {
        const snap = get().snapshot;
        const gf = snap.funds["general-fund"];
        if (!gf) return;
        const fund = funds.find((f) => f.id === "general-fund");
        const nextAmounts: Record<string, number> = { ...gf.expenditureAmounts };
        for (const [id, amt] of Object.entries(amounts)) {
          const exp = fund?.expenditures.find((e) => e.id === id);
          if (!exp) continue;
          const max = exp.adoptedAmount * 1.5;
          nextAmounts[id] = Math.max(0, Math.min(max, Math.round(amt)));
        }
        const next = {
          ...snap,
          funds: { ...snap.funds, "general-fund": { ...gf, expenditureAmounts: nextAmounts } },
        };
        set({
          snapshot: next,
          activeFundId: "general-fund",
          activeCategoryId: null,
          step: "explore",
          onboardingDone: true,
          lastViolation: checkViolations(next),
        });
      },

      updateRevenue: (fundId, revId, amount) => {
        const next = setFundRevenue(get().snapshot, fundId, revId, amount);
        set({ snapshot: next, lastViolation: checkViolations(next) });
      },

      updateLevers: (levers) => {
        const next = setLevers(get().snapshot, levers);
        set({ snapshot: next, lastViolation: checkViolations(next) });
      },

      reset: () =>
        set({
          snapshot: getInitialSnapshot(),
          step: "explore",
          lastViolation: null,
          activeFundId: "general-fund",
        }),

      loadSnapshot: (snapshot) => {
        const multi =
          "funds" in snapshot ? snapshot : legacyToMultiFund(snapshot as BudgetSnapshot);
        set({
          snapshot: multi,
          step: "review",
          lastViolation: checkViolations(multi),
        });
      },

      setShareMeta: (title, authorName) =>
        set({
          snapshot: {
            ...get().snapshot,
            title,
            authorName,
            createdAt: new Date().toISOString(),
          },
        }),

      clearViolation: () => set({ lastViolation: null }),
      getLegacySnapshot: () => multiFundToLegacy(get().snapshot),
    }),
    {
      name: "mesa-budget-simulator-v4",
      partialize: (s) => ({
        snapshot: s.snapshot,
        onboardingDone: s.onboardingDone,
        viewMode: s.viewMode,
      }),
    },
  ),
);

export function useBalance() {
  const snapshot = useBudgetStore((s) => s.snapshot);
  return calculateMultiFundBalance(snapshot);
}

export function useActiveFund() {
  const activeFundId = useBudgetStore((s) => s.activeFundId);
  return funds.find((f) => f.id === activeFundId) ?? funds[0];
}
