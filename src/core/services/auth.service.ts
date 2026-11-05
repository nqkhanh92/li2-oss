import { verifyJwt as verifyJwtToken } from '@/shared/lib/auth'
import { profileService } from './profile.service'
import { UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { TablesUpdate } from '@/shared/types/database.types'
import { casdoorServerSdk } from '@/shared/lib/casdoor/server'

export class AuthService {
  public async verifyJwt(accessToken: string) {
    const { payload } = await verifyJwtToken(accessToken)

    const profile = await profileService.getProfile(payload.sub)
    if (!profile) throw new UnauthorizedError()

    return profile
  }
  public async getAuthToken(code: string) {
    const { access_token, refresh_token } = await casdoorServerSdk.getAuthToken(code)
    return { access_token, refresh_token }
  }

  public async verifyAndUpdateProfile(accessToken: string, _data?: TablesUpdate<'profiles'>) {
    const { payload } = await verifyJwtToken(accessToken)
    const result = await profileService.upsertAndGetProfile({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.avatar ?? null,
      last_logged_in: new Date().toISOString(),
      ..._data,
    })
    return {
      ...result,
      avatar: payload.avatar,
    }
  }
}

export const authService =
  process.env.NODE_ENV !== 'production'
    ? new AuthService()
    : globalThis._authService ?? (globalThis._authService = new AuthService())
