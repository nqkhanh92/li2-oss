import { create } from 'zustand'

interface IdentityStore {
  uid: string | null
  fp: string | null
  setUid: (uid: string) => void
  setFp: (fp: string) => void
}

export const identityStore = create<IdentityStore>((set) => ({
  uid: null,
  fp: null,
  setUid: (uid: string) => set({ uid }),
  setFp: (fp: string) => set({ fp }),
}))
