import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { supabaseService } from '@/infrastructure/database/supabase'

export const GET = async (request: NextRequest, { params }: { params: { token: string } }) => {
  const token = params.token
  if (!token) {
    throw new BadRequestError('Token is required')
  }

  const { data, error } = await supabaseService
    .from('user_email_preference')
    .select('email, categories')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (error || !data) {
    throw new NotFoundError('Email preference not found')
  }

  return APIResponse.ok({ data })
}

export const PUT = async (request: NextRequest, { params }: { params: { token: string } }) => {
  const token = params.token
  if (!token) {
    throw new BadRequestError('Token is required')
  }

  const body = await request.json()
  const categories = body?.categories
  if (!categories || typeof categories !== 'object') {
    throw new BadRequestError('Invalid categories payload')
  }

  const { data: existing, error: findError } = await supabaseService
    .from('user_email_preference')
    .select('id')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (findError || !existing) {
    throw new NotFoundError('Email preference not found')
  }

  const patch: Record<string, unknown> = { categories, updated_at: new Date().toISOString() }
  if (typeof body?.reason === 'string') patch.unsubscribe_reason = body.reason.trim() || null

  const { data: updated, error: updateError } = await supabaseService
    .from('user_email_preference')
    .update(patch)
    .eq('unsubscribe_token', token)
    .select('email, categories')
    .single()

  if (updateError || !updated) {
    throw new BadRequestError('Failed to update preferences')
  }

  return APIResponse.ok({ data: updated })
}
