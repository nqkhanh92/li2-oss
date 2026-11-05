import { logout } from '@/app/actions/auth'
import { AvailableEvents } from '@/features/bootstrap/stores/bootstrap-store'
import { create } from 'zustand'
export interface UserProfile {
  email: string
  name: string
  created_at?: string
  display_name?: string
  address?: string
  createdTime?: string
  id?: string
  dob?: Date
  timezone?: string
  completed_events?: AvailableEvents[]
  avatar?: string | null
}
export interface AuthStoreValue {
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void
  isAuthenticated: boolean
  logout: () => Promise<void>
}

export const authStore = create<AuthStoreValue>((set) => ({
  profile: null,
  setProfile: (profile: UserProfile | null) => {
    if (profile) {
      set({ profile, isAuthenticated: true })
    } else {
      set({ profile: null, isAuthenticated: false })
    }
  },
  isAuthenticated: false,
  logout: async () => {
    await logout()
    set({ profile: null, isAuthenticated: false })
    return
  },
}))
