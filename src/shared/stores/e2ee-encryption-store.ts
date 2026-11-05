import { create } from 'zustand'
import { exportKeyB64Url } from '../utils/crypto-utils'
type E2EEStore = {
  isE2EEEnabled: boolean
  setIsE2EEEnabled: (enabled: boolean) => void
  e2eeKey: CryptoKey | null
  setE2EEKey: (key: CryptoKey | null) => void
  getBase64Key: () => Promise<string | null>
  reset: () => void
}

export const useE2EEStore = create<E2EEStore>((set, get) => ({
  isE2EEEnabled: false,
  setIsE2EEEnabled: (enabled: boolean) => set({ isE2EEEnabled: enabled }),
  e2eeKey: null,
  setE2EEKey: (key: CryptoKey | null) => set({ e2eeKey: key }),
  reset: () => set({ isE2EEEnabled: false, e2eeKey: null }),
  getBase64Key: async () => {
    const { e2eeKey } = get()
    if (!e2eeKey) return null
    return await exportKeyB64Url(e2eeKey)
  },
}))
