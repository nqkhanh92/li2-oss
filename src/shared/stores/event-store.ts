import { create } from "zustand";

type EventType = "open-mobile-sidebar" | "close-mobile-sidebar";

interface EventStore {
  event: EventType | null;
  setEvent: (event: EventType) => void;
  clearEvent: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  event: null,
  setEvent: (event) => set({ event }),
  clearEvent: () => set({ event: null }),
}));
