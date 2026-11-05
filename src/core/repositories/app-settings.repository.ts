import 'server-only'
import { supabaseService } from '@/infrastructure/database/supabase'

export type AppSettings = {
  id: string
  destination_blacklist: string[]
}

export class AppSettingsRepository {
  async get(): Promise<AppSettings | null> {
    const { data, error } = await supabaseService
      .from('app_settings')
      .select('id, destination_blacklist')
      .limit(1)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') throw error
      // no rows — insert default and return it
      const { data: created, error: createError } = await supabaseService
        .from('app_settings')
        .insert({ destination_blacklist: [] } as any)
        .select('id, destination_blacklist')
        .single()
      if (createError) throw createError
      return created as unknown as AppSettings
    }

    return data as unknown as AppSettings
  }
}

export const appSettingsRepo: AppSettingsRepository =
  globalThis._appSettingsRepo ?? new AppSettingsRepository()

if (process.env.NODE_ENV !== 'production') globalThis._appSettingsRepo = appSettingsRepo
