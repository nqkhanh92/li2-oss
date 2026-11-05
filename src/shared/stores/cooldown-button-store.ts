import { create } from "zustand";
type CooldownButtonStore = {
  cooldownUntil: Map<string, Date>;
  setCooldownUntil: (key: string, until: Date | null) => void;
};
export const useCooldownButtonStore = create<CooldownButtonStore>((set) => ({
  cooldownUntil: new Map(),
  setCooldownUntil: (key: string, until: Date | null) =>
    set((state) => {
      state.cooldownUntil.set(key, until ?? new Date());
      return state;
    }),
}));
