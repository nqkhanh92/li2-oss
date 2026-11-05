import { HybridAuditLogger } from "./hybrid-audit-logger";

export const hybridAuditLogger =
  globalThis._hybridAuditLogger ?? new HybridAuditLogger();

if (process.env.NODE_ENV !== "production")
  globalThis._hybridAuditLogger = hybridAuditLogger;
