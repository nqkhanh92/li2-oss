import { NextRequest, NextResponse } from 'next/server'
import { getUserOrgPermissions } from '@/shared/lib/permission/permissions'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const permissions = await getUserOrgPermissions(params.org_id)
  return NextResponse.json(permissions)
})
