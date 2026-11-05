import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { IntegrationType } from '@/features/integrations/constants'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { z } from 'zod'
import { ParcelvoyIntegrationService } from '@/infrastructure/external/integrations/parcelvoy.service'
import { BaseError } from '@/infrastructure/response/errors/base.error'
type Module = 'journeys' | 'entrances'
export async function GET(
  request: NextRequest,
  { params }: { params: { org_id: string; integration_id: string; module: Module } }
) {
  // try {
  //   await ensureOrgMember(params.org_id)
  //   const supabase = await createServiceClient()
  //   const query = supabase.from('integrations').select('*').eq('id', params.integration_id)
  //   const { data, error } = await query.single()
  //   if (error || !data || data.type !== IntegrationType.PARCELVOY) {
  //     throw new BadRequestError('Invalid integration!')
  //   }
  //   const config = data.config as z.infer<typeof createIntegrationSchema>['config']
  //   const parcelvoyService = new ParcelvoyIntegrationService(config)
  //   switch (params.module) {
  //     case 'journeys':
  //       const journeys = await parcelvoyService.getAllJourneys()
  //       return NextResponse.json(journeys)
  //     case 'entrances':
  //       const journeyId = request.nextUrl.searchParams.get('journey_id')
  //       if (!journeyId) {
  //         throw new BadRequestError('Journey ID is required!')
  //       }
  //       const entrances = await parcelvoyService.getAllEntrances(journeyId)
  //       return NextResponse.json(entrances)
  //   }
  //   return NextResponse.json([])
  // } catch (error: any) {
  //   if (error instanceof BaseError) {
  //     return error.toResponse()
  //   }
  //   return new AppError(error.message).toResponse()
  // }
}
