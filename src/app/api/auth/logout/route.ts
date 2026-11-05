import { logout } from '@/app/actions/auth'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'tldts'

const POST_IMPL = async (request: NextRequest) => {
  const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 })
  await logout({ redirect_to: null })
  return response
}

export const POST = withCors(POST_IMPL)

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})
