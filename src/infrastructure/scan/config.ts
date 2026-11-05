/**
 * Env for the ClamAV content scan (`docs/artifact-scan-clamav-spec.md` §2.4, WP1 §3.2).
 *
 * READ AT CALL TIME, never at import time. Same rule as
 * `src/shared/lib/blacklist/safe-browsing.ts`: a module-level `process.env` read is frozen into the
 * bundle the first time the module is pulled in, which makes the flag impossible to flip in a test
 * and impossible to flip on the server without a rebuild. `CLAMAV_ENABLED` is the kill switch for a
 * fail-closed gate, so "change the variable, restart the app" has to be the whole procedure.
 *
 * DEFAULT IS OFF. Merging this code must not change the behaviour of an app that has no clamd
 * container next to it — the gate turns on in `.env.production`, after the container reports
 * healthy, never by being merged (§2.5).
 */

export type ClamavConfig = {
  enabled: boolean
  host: string
  port: number
  timeoutMs: number
}

export const CLAMAV_DEFAULT_HOST = 'clamav'
export const CLAMAV_DEFAULT_PORT = 3310
export const CLAMAV_DEFAULT_TIMEOUT_MS = 15000

/**
 * Thrown — not returned — because every caller of a misconfigured scanner is in the same position:
 * the gate was asked for and cannot be provided, and quietly scanning nothing is the one answer that
 * must not be available. The message names the variable so the fix needs no source reading.
 */
export class ClamavConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClamavConfigError'
  }
}

/**
 * `true` and `1` only. Deliberately NOT "any non-empty string is truthy": `CLAMAV_ENABLED=false` is
 * exactly what an operator writes when turning the gate off, and a loose reading would turn that
 * into ON — the worst direction for a fail-closed layer to be wrong in.
 */
function readEnabled(raw: string | undefined): boolean {
  const value = (raw ?? '').trim().toLowerCase()
  return value === 'true' || value === '1'
}

function readPositiveInt(raw: string | undefined, fallback: number, variable: string): number {
  if (raw === undefined) return fallback
  const trimmed = raw.trim()
  if (trimmed === '') return fallback
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value <= 0)
    throw new ClamavConfigError(
      `${variable} must be a positive integer, got ${JSON.stringify(raw)}`
    )
  return value
}

/**
 * The shape the client works from. When `enabled` is false the other three are still filled with
 * their defaults rather than zeroed: a config object whose fields mean nothing in one branch is a
 * config object every reader has to remember a rule about.
 *
 * `CLAMAV_HOST` UNSET falls back to `clamav` (the compose service name, §6); `CLAMAV_HOST=""` while
 * enabled THROWS. That is the only sensible reading of "enabled but no host" in spec §3.2 given the
 * variable has a default — an operator who blanked the value meant something by it, and silently
 * substituting a hostname they did not write would point the scan at whatever answers on that name.
 */
export function readClamavConfig(): ClamavConfig {
  const enabled = readEnabled(process.env.CLAMAV_ENABLED)

  const rawHost = process.env.CLAMAV_HOST
  const host = rawHost === undefined ? CLAMAV_DEFAULT_HOST : rawHost.trim()
  if (enabled && !host)
    throw new ClamavConfigError(
      'CLAMAV_ENABLED is on but CLAMAV_HOST is empty. Set CLAMAV_HOST (the clamd service name, e.g. `clamav`) or set CLAMAV_ENABLED=false.'
    )

  return {
    enabled,
    host,
    port: readPositiveInt(process.env.CLAMAV_PORT, CLAMAV_DEFAULT_PORT, 'CLAMAV_PORT'),
    timeoutMs: readPositiveInt(
      process.env.CLAMAV_TIMEOUT_MS,
      CLAMAV_DEFAULT_TIMEOUT_MS,
      'CLAMAV_TIMEOUT_MS'
    ),
  }
}
