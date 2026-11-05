import { IntegrationType } from '@/features/integrations/constants'
import { BaseIntegrationService } from './base'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { z } from 'zod'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { GoogleSpreadSheet as GoogleSpreadSheetType } from '@/core/types/integration.type'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { drive_v3, drive } from '@googleapis/drive'
import { logger } from '@/infrastructure/logging/logger'
import { integrationService } from '@/core/services/integration.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import Papa from 'papaparse'
import { notificationService } from '@/core/services/notification.service'
import { NotificationType } from '@/core/types/notification.type'

const log = logger.child({
  service: 'GoogleSheetsIntegrationService',
})
export class GoogleSheetsIntegrationService extends BaseIntegrationService<IntegrationType.GOOGLE_SHEETS> {
  private client: OAuth2Client
  constructor(
    config: Extract<
      z.infer<typeof createIntegrationSchema>,
      { type: IntegrationType.GOOGLE_SHEETS }
    >['config'],
    integrationId?: string
  ) {
    super(IntegrationType.GOOGLE_SHEETS, config, integrationId)
    this.client = new OAuth2Client({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SHEETS_CLIENT_SECRET,
      redirectUri: process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000',
    })

    this.client.on('tokens', (tokens) => {
      log.info(
        { hasToken: !!tokens.access_token, fields: Object.keys(tokens ?? {}) },
        'GoogleSheetsIntegrationService refreshToken'
      )
      if (tokens.access_token && this.integrationId) {
        integrationService.rawUpdate(this.integrationId, {
          config: {
            ...this.config,
            access_token: tokens.access_token,
            id_token: tokens.id_token,
            expiry_date: tokens.expiry_date,
          },
        })
      }
    })

    this.client.setCredentials({
      access_token: this.config.access_token,
      refresh_token: this.config.refresh_token,
    })
    log.info(
      {
        hasAccessToken: !!this.config.access_token,
        hasRefreshToken: !!this.config.refresh_token,
        tokenExpirationDate: this.config.expiry_date,
        tokenExpired: this.config.expiry_date && this.config.expiry_date < Date.now(),
      },
      'GoogleSheetsIntegrationService initialized'
    )
  }

  async validateConfig(): Promise<boolean> {
    const { valid } = await this.getTokens()
    return valid
  }

  async getTokens(): Promise<{ tokens: Credentials; valid: boolean }> {
    const { tokens, res } = await this.client.getToken(this.config.auth_code)

    return { tokens, valid: res?.status === 200 }
  }

  async getSpreadsheets(): Promise<GoogleSpreadSheetType[]> {
    const driveClient = drive({ version: 'v3', auth: this.client })
    const res = await driveClient.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name)',
    })
    const files = res.data.files
    if (files) {
      return files.map((file) => ({
        id: file.id as string,
        name: file.name as string,
      }))
    }
    return []
  }

  async getSheets(spreadsheetId: string) {
    const doc = new GoogleSpreadsheet(spreadsheetId, this.client)
    await doc.loadInfo()
    const sheets = doc.sheetsByIndex
    return sheets.map((sheet) => ({
      id: sheet.sheetId,
      name: sheet.title,
    }))
  }

  async getSheetHeaders(spreadsheetId: string, sheetId: string) {
    const doc = new GoogleSpreadsheet(spreadsheetId, this.client)
    await doc.loadInfo()
    const sheet = doc.sheetsById[Number(sheetId)]
    if (!sheet) throw new BadRequestError(`Sheet ${sheetId} not found`)

    const headers = await sheet.loadHeaderRow().then(() => {
      return sheet.headerValues
    })
    return headers
  }

  async getSheetDataById(spreadsheetId: string, sheetId: string | number, limit = 1000) {
    const doc = new GoogleSpreadsheet(spreadsheetId, this.client)
    await doc.loadInfo()
    const sheet = doc.sheetsById[Number(sheetId)]

    if (!sheet) throw new BadRequestError(`Sheet ${sheetId} not found`)
    await sheet.loadHeaderRow()

    const headers = sheet.headerValues || []
    const rows = await sheet.getRows({ offset: 0, limit })
    return { headers, rows }
  }

  async getCsvFile(spreadsheetId: string, sheetId: string | number) {
    const { headers, rows } = await this.getSheetDataById(spreadsheetId, sheetId)
    const dataRows = rows.map((r) => headers.map((h) => r.get(h) ?? ''))
    const output = [headers, ...dataRows]

    log.info(
      { spreadsheetId, sheetId, headersCount: headers.length, rowsCount: rows.length },
      'GoogleSheetsIntegrationService getCsvFile'
    )
    const csv = Papa.unparse(output)
    const blob = new Blob([csv], { type: 'text/csv' })
    return new File([blob], `${spreadsheetId}-sheet-${sheetId}.csv`, { type: 'text/csv' })
  }

  async createSpreadsheet(name: string) {
    const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(this.client, {
      title: name,
    })

    if (!doc || !doc.spreadsheetId) {
      log.error('Failed to create spreadsheet')
      throw new Error('Failed to create spreadsheet')
    }
    const spreadsheet = new GoogleSpreadsheet(doc.spreadsheetId, this.client)
    await spreadsheet.loadInfo()
    const sheets = spreadsheet.sheetsByIndex

    return {
      id: spreadsheet.spreadsheetId,
      name: spreadsheet.title,
      sheets: sheets.map((sheet) => ({
        id: sheet.sheetId,
        name: sheet.title,
      })),
    }
  }

  async createAndWriteSheet(
    name: string,
    headers: string[],
    rows: string[][],
    options: { onSuccess?: () => void; onError?: (errorMessage: string) => void }
  ) {
    try {
      const spreadsheet = await this.createSpreadsheet(name)
      const doc = new GoogleSpreadsheet(spreadsheet.id, this.client)
      await doc.loadInfo()
      const sheet = doc.sheetsByIndex[0]

      await sheet.setHeaderRow(headers)

      await sheet.addRows(rows)
      log.info(
        {
          spreadsheetId: spreadsheet.id,
          sheetId: sheet.sheetId,
          headersCount: headers.length,
          rowsCount: rows.length,
        },
        'User export to Google Sheets'
      )

      options?.onSuccess?.()

      return spreadsheet
    } catch (error) {
      log.error({ error }, 'Failed to export to Google Sheets')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      options?.onError?.(errorMessage)
      return null
    }
  }
}
