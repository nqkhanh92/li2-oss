import { BaseService } from './base.service'
import { logger } from '@/infrastructure/logging/logger'
import { profileRepo, ProfileRepository } from '../repositories/profile.repository'
import { SetPassword, User } from 'casdoor-nodejs-sdk/lib/cjs/user'
import { AvailableEvents } from '@/features/bootstrap/stores/bootstrap-store'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import dayjs from 'dayjs'

const log = logger.child({ module: 'profile-service' })
export class ProfileService extends BaseService<ProfileRepository> {
  constructor(repo: ProfileRepository) {
    super(repo)
  }
  async upsertAndGetProfile(_data: TablesInsert<'profiles'>) {
    const { data, error } = await this.repo.upsertAndGetProfile(_data)
    if (error) {
      throw error
    }
    if (data.signup_ip) {
      return { data, isNew: false }
    }
    return { data, isNew: true }
  }

  async getProfile(id: string) {
    return await this.repo.findById(id)
  }

  async getProfileByEmail(email: string) {
    return await this.repo.findByEmail(email)
  }

  async updateProfile(id: string, _data: TablesUpdate<'profiles'>) {
    return await this.repo.updateById(id, _data)
  }

  async deleteProfile({ id, email, user }: { id: string; email: string; user: User }) {
    return await this.repo.deleteProfile({ id, email, user })
  }

  async updateCasdoorPassword({ updateData }: { updateData: SetPassword }) {
    return await this.repo.updateCasdoorPassword({ updateData })
  }

  async markCompletedEvents({ userId, events }: { userId: string; events: AvailableEvents[] }) {
    const profile = await this.getProfile(userId)
    const updatedEvents = new Set([...(profile?.completed_events ?? []), ...events])
    return await this.repo.update(userId, { completed_events: Array.from(updatedEvents) })
  }
}

export const profileService = globalThis._profileService ?? new ProfileService(profileRepo)

if (process.env.NODE_ENV !== 'production') globalThis._profileService = profileService
