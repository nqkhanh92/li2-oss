import crypto from 'crypto'

/**
 * Alphabet for artifact serve tokens: digits + lowercase letters.
 * 36 symbols, so a 16-char token carries ~82 bits — unguessable, and the URL stays
 * case-insensitive (tokens get copied out of QR scans and chat apps that lowercase links).
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const TOKEN_LENGTH = 16

/**
 * 256 % 36 !== 0, so a naive `byte % 36` would make the first 4 symbols of the alphabet slightly
 * more likely. Rejecting bytes at or above the largest multiple of 36 removes that bias.
 */
const REJECT_THRESHOLD = 256 - (256 % ALPHABET.length)

export function generateServeToken(length: number = TOKEN_LENGTH): string {
  let token = ''
  while (token.length < length) {
    for (const byte of crypto.randomBytes(length)) {
      if (byte >= REJECT_THRESHOLD) continue
      token += ALPHABET[byte % ALPHABET.length]
      if (token.length === length) break
    }
  }
  return token
}

export const SERVE_TOKEN_LENGTH = TOKEN_LENGTH
export const SERVE_TOKEN_PATTERN = /^[0-9a-z]{16}$/
