import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import { BaseRepository } from './base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { SetPassword, User } from 'casdoor-nodejs-sdk/lib/cjs/user'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'

export class ProfileRepository extends BaseRepository<'profiles'> {
  constructor() {
    super('profiles')
  }
  async upsertAndGetProfile(_data: TablesInsert<'profiles'>) {
    return await this.query().upsert(_data, { onConflict: 'id' }).select('*').single()
  }

  async findByEmail(email: string) {
    const { data } = await this.query().select('*').eq('email', email).maybeSingle()
    return data
  }

  /**
   * Email only, and tolerant of a missing row — unlike `BaseRepository.findById`, whose `.single()`
   * throws on no-row. Added for the MCP seam (`core/mcp/call-tool.ts`), which needs the real email
   * for the PASETO's required `email` claim but must never turn a missing profile into a 500.
   */
  async findEmailById(id: string): Promise<string | null> {
    const { data, error } = await this.query().select('email').eq('id', id).maybeSingle()
    if (error) throw error
    return data?.email ?? null
  }

  async updateById(id: string, _data: TablesUpdate<'profiles'>) {
    const { data, error } = await this.query().update(_data).eq('id', id)

    if (error) {
      throw error
    }
    return data
  }

  async updateCasdoorPassword({ updateData }: { updateData: SetPassword }) {
    const updatePasswordResponse = await casdoorServerSdk.setPassword(updateData)

    if (updateData.newPassword && updateData.oldPassword) {
      const updatePasswordResponse = await casdoorServerSdk.setPassword(updateData)
      if (updatePasswordResponse?.data?.status === 'error') {
        throw new Error(String(updatePasswordResponse.data.msg))
      }
    }
    return updatePasswordResponse.data
  }

  async deleteProfile({ id, email, user }: { id: string; email: string; user: User }) {
    const data = await casdoorServerSdk.deleteUser(user)
    if (data.status !== 200) {
      throw new AppError()
    }
    const { error } = await supabaseService
      .from('profiles')
      .update({ email: `(Deleted) ${email}` })
      .eq('id', id)
    if (error) {
      throw error
    }
  }
}
export const profileRepo = globalThis._profileRepo ?? new ProfileRepository()

if (process.env.NODE_ENV !== 'production') globalThis._profileRepo = profileRepo
