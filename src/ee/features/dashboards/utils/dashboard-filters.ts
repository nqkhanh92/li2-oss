/**
 * Partition a dashboard list into owned and shared-with-me.
 * `profileId` is the current user's ID; may be null while auth is loading.
 */
export function partitionByOwner<T extends { created_by: string }>(
  dashboards: T[],
  profileId: string | null | undefined,
): { mine: T[]; shared: T[] } {
  const mine: T[] = []
  const shared: T[] = []
  for (const d of dashboards) {
    if (d.created_by === profileId) mine.push(d)
    else shared.push(d)
  }
  return { mine, shared }
}

/**
 * Partition a dashboard list into pinned and unpinned.
 */
export function partitionByPinned<T extends { is_pinned?: boolean }>(
  dashboards: T[],
): { pinned: T[]; unpinned: T[] } {
  const pinned: T[] = []
  const unpinned: T[] = []
  for (const d of dashboards) {
    if (d.is_pinned) pinned.push(d)
    else unpinned.push(d)
  }
  return { pinned, unpinned }
}
