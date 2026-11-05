import crypto from 'crypto'

function evpBytesToKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  let data = Buffer.alloc(0)
  let prev: Buffer = Buffer.alloc(0)

  while (data.length < keyLen + ivLen) {
    // ensure update() always receives a Buffer
    prev = crypto
      .createHash('md5')
      .update(Buffer.concat([prev, Buffer.from(password, 'utf8'), salt]))
      .digest()

    data = Buffer.concat([data, prev])
  }

  return {
    key: data.slice(0, keyLen),
    iv: data.slice(keyLen, keyLen + ivLen),
  }
}

export function decrypt(ciphertextBase64: string, passphrase: string): string {
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')

  // CryptoJS format: "Salted__" + 8-byte salt + encrypted data
  const header = ciphertext.slice(0, 8).toString('utf8')
  if (header !== 'Salted__') {
    throw new Error('Invalid ciphertext (missing Salted__ prefix)')
  }

  const salt = ciphertext.slice(8, 16)
  const encrypted = ciphertext.slice(16)

  const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16) // AES-256-CBC

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
