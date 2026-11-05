import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { supabaseService } from '@/infrastructure/database/supabase'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

const DEFAULT_CATEGORIES = { system: true, security: true, analytics: true }

export const GET = withAuth(async (request: NextRequest, { context }) => {
  const email = context.email
  if (!email) {
    throw new BadRequestError('Email not found in session')
  }

  const { data: existing } = await supabaseService
    .from('user_email_preference')
    .select('email, categories, unsubscribe_token')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return APIResponse.ok({ data: existing })
  }

  const { data: created, error: createError } = await supabaseService
    .from('user_email_preference')
    .insert({ email, categories: DEFAULT_CATEGORIES })
    .select('email, categories, unsubscribe_token')
    .single()

  if (createError || !created) {
    throw new BadRequestError('Failed to create email preference')
  }

  return APIResponse.ok({ data: created })
})
