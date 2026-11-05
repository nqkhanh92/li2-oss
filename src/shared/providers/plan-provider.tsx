"use client";
import { Plan } from "@/shared/types/plan-permission";
import React from "react";
import { create } from "zustand";

export interface UserPlan {
  id?: string;
  user_id?: string;
  plan_id?: string;
  plans?: Plan;
  total_organizations?: number;
  expires_at?: string;
}

interface PlanProviderValue {
  plan: UserPlan | null;
  setPlan: (plan: UserPlan | null) => void;
}

const Context = React.createContext<PlanProviderValue | null>(null);
type PlanProviderProps = {
  children: React.ReactNode;
  plan?: UserPlan | null;
};
const PlanProvider = ({ children, plan }: PlanProviderProps) => {
  const useStore = React.useMemo(() => {
    return create<PlanProviderValue>((set) => ({
      plan: plan || null,
      setPlan: (plan: UserPlan | null) =>
        set((state) => ({ ...state, plan: plan })),
    }));
  }, [plan]);

  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

const usePlanProvider = (): PlanProviderValue => {
  const ctx = React.useContext(Context);
  if (!ctx) throw Error(`Lack of provider`);
  return ctx;
};

export { PlanProvider, usePlanProvider };
