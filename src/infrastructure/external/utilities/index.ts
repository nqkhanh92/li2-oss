import { Utilities } from "./utilities.service";

export const utilitiesService = globalThis._utilitiesService ?? new Utilities();

if (process.env.NODE_ENV !== "production")
  globalThis._utilitiesService = utilitiesService;
