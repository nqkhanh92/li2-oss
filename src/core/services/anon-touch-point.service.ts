import { z } from 'zod'
import {
  anonTouchPointRepo,
  AnonTouchPointRepository,
} from '../repositories/anon-touch-point.repository'
import { BaseService } from './base.service'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { encode } from 'base62'
import { SHORT_ID_OFFSET } from '@/shared/constants/utils'
import { domainService } from './domain.service'

/**
 * Service class for managing anonymous touch points (temporary links created without authentication).
 * Handles creation, retrieval, counting, and migration of anonymous touch points.
 * Anonymous touch points are automatically deleted after 7 days.
 *
 * @extends BaseService<AnonTouchPointRepository>
 */
export class AnonTouchPointService extends BaseService<AnonTouchPointRepository> {
  /**
   * Creates an instance of AnonTouchPointService.
   *
   * @param {AnonTouchPointRepository} repo - The anonymous touch point repository instance
   */
  constructor(repo: AnonTouchPointRepository) {
    super(repo)
  }

  /**
   * Retrieves detailed information about a specific anonymous touch point.
   *
   * @param {string} tpId - The touch point ID
   * @param {string} anonId - The anonymous user ID
   * @returns {Promise<any>} The anonymous touch point details
   */
  async getAnonTouchPointDetail(tpId: string, anonId: string) {
    return this.repo.getAnonTouchPointDetail(tpId, anonId)
  }

  /**
   * Retrieves all anonymous touch points created by a specific anonymous user.
   *
   * @param {string} anonId - The anonymous user ID
   * @returns {Promise<any[]>} Array of anonymous touch points
   */
  public getAnonTouchPointList(anonId: string) {
    return this.repo.getAnonTouchPointList(anonId)
  }

  /**
   * Retrieves all anonymous touch points that haven't been migrated to permanent touch points.
   * Used when a user signs up to migrate their anonymous links to their account.
   *
   * @param {string} anonId - The anonymous user ID
   * @returns {Promise<any[]>} Array of non-migrated anonymous touch points
   */
  public getNonMigratedAnonTouchPointList(anonId: string) {
    return this.repo.getNonMigratedAnonTouchPointList(anonId)
  }

  /**
   * Creates a new anonymous touch point with automatic short URL generation.
   * Anonymous touch points are prefixed with 'f-' and automatically expire after 7 days.
   * Supports QR code generation if enabled in variants_content.
   *
   * @param {z.infer<typeof touchPointAnonSchema>} validatedData - Validated anonymous touch point data
   * @param {Object} context - Context information for the creation
   * @param {string} context.anonId - The anonymous user ID
   * @param {string} context.ip - The IP address of the creator
   * @returns {Promise<any>} The created anonymous touch point
   */
  async createAnonTouchPoint(
    validatedData: z.infer<typeof touchPointAnonSchema>,
    { anonId, ip }: { anonId: string; ip: string },
    opts?: { expiresInMs?: number }
  ) {
    // Default TTL = 7 days (legacy landing-page behavior). Callers may override
    // (e.g. the attested sample-app route passes 24h). Omitting opts is identical to before.
    const ttlMs = opts?.expiresInMs ?? 7 * 24 * 60 * 60 * 1000
    const nextShortId = await this.repo.getNextShortId()
    const shortCode = encode(nextShortId + SHORT_ID_OFFSET)

    const defaultDomain = await domainService.findDefaultSystemDomain()
    const shortUrl = `https://${
      defaultDomain?.domain || process.env.NEXT_PUBLIC_SHORT_LINK_URL
    }/f-${shortCode}`

    if (validatedData.variants_content?.QR?.enabled) {
      validatedData.qr_customize_options = {
        ...validatedData.qr_customize_options,
        rawData: shortUrl + '?t=1',
        data: shortUrl + '?t=1',
      }
    }

    const insertedTp = await this.repo.create({
      anon_id: anonId,
      ...validatedData,
      short_id: nextShortId,
      short_code: shortCode,
      short_url: shortUrl,
      ip,
      deleted_at: new Date(Date.now() + ttlMs).toISOString(),
    })
    return insertedTp
  }

  /**
   * Counts the number of anonymous touch points created today by a specific anonymous user.
   * Used for rate limiting anonymous touch point creation.
   *
   * @param {string} anonId - The anonymous user ID
   * @returns {Promise<number>} The count of touch points created today
   */
  async countCreatedToday(anonId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return this.repo.countAnonTouchPoint(anonId, (q) => q.gte('created_at', today.toISOString()))
  }
  /**
   * Counts the total number of anonymous touch points created by a specific anonymous user.
   *
   * @param {string} anonId - The anonymous user ID
   * @returns {Promise<number>} The total count of touch points
   */
  async countCreated(anonId: string) {
    return this.repo.countAnonTouchPoint(anonId)
  }

  /**
   * Marks multiple anonymous touch points as migrated to permanent touch points.
   * Called after a user signs up and their anonymous links are converted to regular links.
   *
   * @param {string[]} anonTpIds - Array of anonymous touch point IDs to mark as migrated
   * @returns {Promise<any>} The update result
   */
  async markMigrated(anonTpIds: string[]) {
    return this.repo.updateMany(anonTpIds, {
      migrated: true,
    })
  }
}

export const anonTouchPointService =
  process.env.NODE_ENV !== 'production'
    ? new AnonTouchPointService(anonTouchPointRepo)
    : globalThis._anonTouchPointService ??
      (globalThis._anonTouchPointService = new AnonTouchPointService(anonTouchPointRepo))
