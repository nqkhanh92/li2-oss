// crypto-utils.ts
// ----------------
const te = new TextEncoder()
const td = new TextDecoder()

/** Base64URL helpers */
export const toB64Url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

export const fromB64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0
  const bin = atob(b64 + '='.repeat(pad))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr.buffer
}

/** Generate a random AES-128-GCM CryptoKey */
export async function generateAes128GcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 128 },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/** Export/Import key as base64url (raw 16 bytes) */
export async function exportKeyB64Url(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key) // 16 bytes
  return toB64Url(raw)
}

export async function importKeyFromB64Url(b64url: string): Promise<CryptoKey> {
  const raw = fromB64Url(b64url)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

/** Derive AES-128-GCM key from passphrase using PBKDF2 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>, // persist alongside ciphertext
  iterations = 120_000
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 128 },
    true,
    ['encrypt', 'decrypt']
  )
}

export type EncryptResult = {
  alg: string | 'AES-128-GCM'
  iv: string // base64url (12 bytes recommended)
  tagLength: number // bits (usually 128)
  ciphertext: string // base64url
}

/** Encrypt (destination string/URL), optional AAD */
export async function encryptDestination(
  destination: string,
  key: CryptoKey
): Promise<EncryptResult> {
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit nonce
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    te.encode(destination)
  )

  return {
    alg: 'AES-128-GCM',
    iv: toB64Url(iv.buffer),
    tagLength: 128,
    ciphertext: toB64Url(ciphertext),
  }
}

/** Decrypt */
export async function decryptDestination(payload: EncryptResult, key: CryptoKey): Promise<string> {
  const iv = fromB64Url(payload.iv)
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: payload.tagLength },
    key,
    fromB64Url(payload.ciphertext)
  )
  return td.decode(plainBuf)
}
