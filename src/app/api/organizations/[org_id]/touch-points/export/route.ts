import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { NextRequest, NextResponse } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { touchPointService } from '@/core/services/touch-point.service'
import { integrationService } from '@/core/services/integration.service'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { GoogleSheetsIntegrationService } from '@/infrastructure/external/integrations/google-sheets.service'
import { TouchPointDataTransformer } from '@/features/touch-points/utils/data-transformer'
import { getColumns } from '@/features/touch-points/constants/import'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { TouchPointDetail } from '@/core/types/touch-point.type'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { notificationService } from '@/core/services/notification.service'
import { NotificationType } from '@/core/types/notification.type'

const log = logger.child({ route: 'touch-point-export' })
export const POST = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    const { fields, searchFilters, type, integration_id } = await request.json()

    const data = await touchPointService.getAllTouchPointsForExport(
      params.org_id,
      fields,
      searchFilters
    )
    if (!data || data.length === 0) {
      throw new NotFoundError('No data found for export', {
        key: 'common:messages.error.no_data_found',
      })
    }

    switch (type) {
      case 'csv':
        return APIResponse.ok({
          data,
          i18nMessage: {
            key: 'common:messages.success.created',
            params: {
              field: 'Export Links',
            },
          },
        })
      case 'sheets':
        if (!integration_id) {
          throw new BadRequestError('Integration ID is required')
        }

        const integration = await integrationService.findById(params.org_id, integration_id)
        if (!integration) {
          throw new NotFoundError('Integration not found')
        }

        try {
          const sheetsService = createIntegrationService(
            integration.type,
            integration.config,
            integration.id
          ) as GoogleSheetsIntegrationService
          console.log({ integration })

          const sheetName = `Li2-Export-${new Date().toISOString()}.csv`
          const i18nServer = await initServerI18n(['touchpoint', 'common'])
          const columns = getColumns(i18nServer.t)
          const transformer = new TouchPointDataTransformer(columns)
          const headers = transformer.getHeaders(fields)
          const rows = transformer.getRows(data as unknown as TouchPointDetail[], fields)

          sheetsService.createAndWriteSheet(sheetName, headers, rows, {
            onSuccess: () => {
              console.log('SUCCESS: Google Sheets export completed, creating notification')
              notificationService.createTypedNotification(NotificationType.EXPORT_COMPLETE, {
                exportType: 'sheets',
                organizationId: params.org_id,
                userId: context.userId,
              })
            },
            onError: (errorMessage) => {
              console.log('ERROR: Google Sheets export failed:', errorMessage)
              notificationService.createTypedNotification(NotificationType.EXPORT_FAILED, {
                exportType: 'sheets',
                organizationId: params.org_id,
                errorMessage,
                userId: context.userId,
              })
              console.error('Google Sheets export failed:', errorMessage)
            },
          })
          return APIResponse.created({
            message: 'Exported to Google Sheets successfully',
            i18nMessage: {
              key: 'common:messages.success.exported_to_google_sheets',
              params: {
                fileName: sheetName,
              },
            },
          })
        } catch (error) {
          throw new AppError(
            error instanceof Error ? error.message : 'Failed to export to Google Sheets'
          )
        }

        break
      default:
        break
    }
    throw new Error('Unsupported export type')
  }
)
