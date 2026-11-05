import { createClient } from '@/infrastructure/database/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest) => {
  const supabase = await createClient()
  const { data: plan, error } = await supabase.from('user_plans').select('*, plans(*)').single()
  if (error) {
    throw error
  }
  return NextResponse.json(plan)
})
