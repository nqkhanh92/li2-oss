import { SystemLogger } from "./system-logger";

export const systemLogger = globalThis._systemLogger ?? new SystemLogger();

if (process.env.NODE_ENV !== "production")
  globalThis._systemLogger = systemLogger;
