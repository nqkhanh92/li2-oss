import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { integrationService } from '@/core/services/integration.service'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { GoogleSheetsIntegrationService } from '@/infrastructure/external/integrations/google-sheets.service'

export const GET = withAuth<{
  org_id: string
  integration_id: string
  spreadsheet_id: string
  sheet_id: string
}>(async (req, { params }) => {
  const integration = await integrationService.findById(params.org_id, params.integration_id)

  if (!integration) {
    throw new Error('Integration not found')
  }
  const sheetService = createIntegrationService(
    integration.type,
    integration.config,
    integration.id
  ) as GoogleSheetsIntegrationService
  const headers = await sheetService.getSheetHeaders(params.spreadsheet_id, params.sheet_id)

  return APIResponse.ok({
    data: headers,
  })
})
