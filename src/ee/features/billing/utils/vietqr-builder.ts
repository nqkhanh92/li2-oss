export class VietQRBuilder {
  static tlv(id: string, value = ''): string {
    const len = value.length.toString().padStart(2, '0')
    return `${id}${len}${value}`
  }

  /** CRC16/CCITT-FALSE */
  static crc16(payload: string): string {
    let crc = 0xffff
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
        crc &= 0xffff
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
  }

  /** Consumer Account Information (Tag 38) */
  static buildConsumerAccount({
    acquirerId,
    accountNumber,
    serviceCode = 'QRIBFTTA',
  }: {
    acquirerId: string
    accountNumber: string
    serviceCode?: string
  }): string {
    const bankInfo = this.tlv('00', acquirerId) + this.tlv('01', accountNumber)
    const consumer =
      this.tlv('00', 'A000000727') + this.tlv('01', bankInfo) + this.tlv('02', serviceCode)
    return this.tlv('38', consumer)
  }

  /** Additional Data Field Template (Tag 62) */
  static buildAdditionalData(
    data: Partial<Record<
      'billNumber' | 'mobileNumber' | 'storeLabel' | 'loyaltyNumber' |
      'referenceLabel' | 'customerLabel' | 'terminalLabel' | 'purpose',
      string
    >> = {}
  ): string {
    const mapping: Record<string, string> = {
      billNumber: '01', mobileNumber: '02', storeLabel: '03',
      loyaltyNumber: '04', referenceLabel: '05', customerLabel: '06',
      terminalLabel: '07', purpose: '08',
    }
    let value = ''
    for (const [key, tag] of Object.entries(mapping)) {
      const v = data[key as keyof typeof data]
      if (v) value += this.tlv(tag, v)
    }
    return value ? this.tlv('62', value) : ''
  }

  static generate({
    accountNumber,
    acquirerId,
    amount,
    additionalData = {},
  }: {
    accountNumber: string
    acquirerId: string
    amount?: string | number
    additionalData?: Parameters<typeof VietQRBuilder.buildAdditionalData>[0]
  }): string {
    let payload = ''
    payload += this.tlv('00', '01')             // Payload Format Indicator
    payload += this.tlv('01', '12')             // Dynamic QR
    payload += this.buildConsumerAccount({ acquirerId, accountNumber })
    payload += this.tlv('53', '704')            // Currency VND
    if (amount != null) payload += this.tlv('54', String(amount))
    payload += this.tlv('58', 'VN')             // Country
    payload += this.buildAdditionalData(additionalData)
    const crcInput = payload + '6304'
    return crcInput + this.crc16(crcInput)
  }
}
