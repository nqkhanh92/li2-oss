const STORAGE_KEY = 'lastSelectedOrg'

export type OrgPreference = {
  user_id: string
  default_org_id: string
  is_manual_set: boolean
}

function readAll(): OrgPreference[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(prefs: OrgPreference[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function getOrgPreference(user_id: string): OrgPreference | undefined {
  return readAll().find((p) => p.user_id === user_id)
}

/** Auto-update: only sets default_org_id if the user has no manual pin. */
export function setAutoDefault(user_id: string, default_org_id: string) {
  const all = readAll()
  const idx = all.findIndex((p) => p.user_id === user_id)
  if (idx === -1) {
    all.push({ user_id, default_org_id, is_manual_set: false })
  } else if (!all[idx].is_manual_set) {
    all[idx].default_org_id = default_org_id
  }
  writeAll(all)
}

/** Manual pin: always updates and marks is_manual_set = true. */
export function setManualDefault(user_id: string, default_org_id: string) {
  const all = readAll()
  const idx = all.findIndex((p) => p.user_id === user_id)
  if (idx === -1) {
    all.push({ user_id, default_org_id, is_manual_set: true })
  } else {
    all[idx].default_org_id = default_org_id
    all[idx].is_manual_set = true
  }
  writeAll(all)
}

/** Clears manual pin for the user (reverts to auto-track behavior). */
export function clearManualDefault(user_id: string) {
  const all = readAll()
  const idx = all.findIndex((p) => p.user_id === user_id)
  if (idx !== -1) {
    all[idx].is_manual_set = false
  }
  writeAll(all)
}
