import { AuditLogger, AuditLoggerConfig } from "./audit-logger";

export const auditLogger =
  globalThis._auditLogger ??
  new AuditLogger<AuditLoggerConfig>({
    schema: "logs",
    table: "audit_logs",
  });

if (process.env.NODE_ENV !== "production")
  globalThis._auditLogger = auditLogger;
