import { NextRequest } from 'next/server'
import { artifactService } from '@/core/services/artifact.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext } from '@/shared/types/request'

export const POST = withAuth<{ org_id: string; artifact_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; artifact_id: string }; context: AuthContext }
  ) => {
    // A publish with no options is legitimate, so an absent or unparsable body means "no options"
    // rather than a 400 — the only fields here are optional anyway.
    const body = await request.json().catch(() => ({}))

    const artifact = await artifactService.publish(params.org_id, context.userId, params.artifact_id, {
      slug: typeof body?.slug === 'string' ? body.slug : undefined,
      domain_id: typeof body?.domain_id === 'string' ? body.domain_id : undefined,
      // B1 (spec R2b): the view mode chosen in the create dialog rides the same request. Absent means
      // "leave it" — the column default is `public`. Validation lives in the service, not here.
      access_mode: typeof body?.access_mode === 'string' ? body.access_mode : undefined,
      password: typeof body?.password === 'string' ? body.password : undefined,
    })

    return APIResponse.ok({
      data: artifact,
      i18nMessage: { key: 'common:messages.success.updated_field', params: { field: '$t(label.artifact)' } },
    })
  }
)
