import { SignJWT } from 'jose'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export const POST = withAuth<{ org_id: string }>(
  async (_req, { params: { org_id }, context }) => {
    await ensureOrgMember(org_id)

    const secret = new TextEncoder().encode(
      process.env.TOOLBAR_SESSION_SECRET!
    )

    const token = await new SignJWT({
      org_id,
      user_id: context.userId,
      purpose: 'toolbar',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret)

    return APIResponse.ok({ data: { token } })
  }
)
