"use server";
import { getSession } from "@/shared/lib/auth/session";
import { systemLogger } from "@/shared/lib/logs/system-logger";
import { LogEvent } from "@/shared/lib/logs/system-logger/system-logger";
import { headers } from "next/headers";

export const logSystemError = async (
  error: { message: string; stack: string; name: string },
  module: string
) => {
  try {
    const userAgent = headers().get("user-agent");

    //** Get user info & user agents,... */
    const forwarded = headers().get("x-forwarded-for");
    const rawIp = forwarded?.split(",")[0].trim() || headers().get("x-real-ip");
    const ip = rawIp?.startsWith("::ffff:")
      ? rawIp.replace("::ffff:", "")
      : rawIp || "Unknown";
    const session = await getSession();

    const event: LogEvent = {
      eventType: "REACT_ERROR_BOUNDARY_CAUGHT",
      errorMessage: error.message,
      userId: session?.id,
      timestamp: new Date(),
      userAgent: userAgent || undefined,
      ipAddress: ip,
      metadata: {
        stack: error.stack,
        name: error.name,
      },
    };
    await systemLogger.logEvent(module, event);
  } catch (error) {
    console.log({ error });
  }
};
