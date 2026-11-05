/**
 * The opaque pagination cursor of `list_artifacts` (WP1 §3).
 *
 * It encodes `{"page":n}` as base64url, and the encoding is the whole point: the repository
 * paginates by OFFSET (`artifact.repository.ts` `listByOrg` → `.range()`), so the cursor cannot
 * promise the stability a keyset cursor does. Handing the page number out raw would freeze that
 * weakness into the tool's contract; an opaque string lets WP-later swap in a real keyset cursor
 * without any client noticing.
 *
 * ⛔ A CURSOR IS NOT A CAPABILITY. It carries no org, no user and no signature, and nothing
 * downstream treats it as proof of anything: the org still comes from the PASETO, and
 * `decodeArtifactCursor` returns a page number or nothing. A tampered cursor can only ask for a
 * different page of the caller's OWN org — which is also what `limit` and a second call can do.
 */

/** Rejected rather than trusted: a page number is a small positive integer or it is garbage. */
const MAX_PAGE = 100_000

export function encodeArtifactCursor(page: number): string {
  return Buffer.from(JSON.stringify({ page }), 'utf8').toString('base64url')
}

/**
 * `null` for "no cursor given" AND for "that cursor is not one of ours" — the two are the same
 * answer (page 1) on purpose. A 400 for a malformed cursor would be a worse experience for the only
 * caller that can produce one: a model that truncated a string it was told was opaque.
 */
export function decodeArtifactCursor(cursor: string | undefined): number | null {
  if (!cursor) return null
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown
    const page = (decoded as { page?: unknown } | null)?.page
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > MAX_PAGE)
      return null
    return page
  } catch {
    return null
  }
}
