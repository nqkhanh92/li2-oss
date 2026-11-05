import { create } from "zustand";
type DomainStore = {
  domainId: string | null;
  setDomainId: (id: string | null) => void;
  pendingDomain: string;
  setPendingDomain: (domain: string) => void;
  cooldownUntil: Date | null;
  setCooldownUntil: (until: Date | null) => void;
};

export const useDomainStore = create<DomainStore>((set) => ({
  domainId: null,
  setDomainId: (id: string | null) => set({ domainId: id }),
  pendingDomain: '',
  setPendingDomain: (domain: string) => set({ pendingDomain: domain }),
  cooldownUntil: null,
  setCooldownUntil: (until: Date | null) => set({ cooldownUntil: until }),
}));
