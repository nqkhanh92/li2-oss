import { integrationService } from '@/core/services/integration.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { GoogleSheetsIntegrationService } from '@/infrastructure/external/integrations/google-sheets.service'

export const GET = withAuth<{ org_id: string; integration_id: string }>(async (req, { params }) => {
  const integration = await integrationService.findById(params.org_id, params.integration_id)

  if (!integration) {
    throw new Error('Integration not found')
  }
  const sheetService = createIntegrationService(
    integration.type,
    integration.config,
    integration.id
  ) as GoogleSheetsIntegrationService
  const spreadsheetsList = await sheetService.getSpreadsheets()

  return APIResponse.ok({
    data: spreadsheetsList,
  })
})

export const POST = withAuth<{ org_id: string; integration_id: string }>(
  async (req, { params }) => {
    const { name } = await req.json()
    const sheetName = name ?? 'New Spreadsheet'
    const integration = await integrationService.findById(params.org_id, params.integration_id)

    if (!integration) {
      throw new Error('Integration not found')
    }
    const sheetService = createIntegrationService(
      integration.type,
      integration.config,
      integration.id
    ) as GoogleSheetsIntegrationService
    const spreadsheet = await sheetService.createSpreadsheet(sheetName)

    return APIResponse.ok({
      data: spreadsheet,
    })
  }
)
