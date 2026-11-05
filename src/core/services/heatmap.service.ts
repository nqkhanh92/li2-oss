import { BaseService } from './base.service'
import { HeatmapRepository, heatmapRepo } from '../repositories/heatmap.repository'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'heatmap.service' })
export class HeatmapService extends BaseService<HeatmapRepository> {
  constructor(repo: HeatmapRepository) {
    super(repo)
  }

  async getClicks(
    orgId: string,
    pagePath: string,
    from: string,
    to: string,
    deviceType?: string,
    gridSize?: number,
    hostname?: string,
    targetWidth?: number,
    tpId?: string,
    targetHeight?: number
  ) {
    await ensureOrgMember(orgId)
    return this.repo.getHeatmapClicks(orgId, pagePath, from, to, deviceType, gridSize, hostname, targetWidth, tpId, targetHeight)
  }

  async getRageClicks(
    orgId: string,
    pagePath: string,
    from: string,
    to: string,
    deviceType?: string,
    hostname?: string,
    tpId?: string
  ) {
    await ensureOrgMember(orgId)
    return this.repo.getRageClickSummary(orgId, pagePath, from, to, deviceType, hostname, tpId)
  }

  async getScrollHeatmap(
    orgId: string,
    pagePath: string | undefined,
    from: string,
    to: string,
    deviceType?: string,
    hostname?: string,
  ) {
    await ensureOrgMember(orgId)
    const data = await this.repo.getScrollHeatmap(orgId, pagePath, from, to, deviceType, hostname)
    // log.debug({
    //   method: 'getScrollHeatmap',
    //   input: {
    //     orgId,
    //     pagePath,
    //     from,
    //     to,
    //     deviceType,
    //     hostname
    //   },
    //   data
    // })
    return data
  }

  async getTopPages(orgId: string, from: string, to: string, tpId?: string) {
    await ensureOrgMember(orgId)
    return this.repo.getTopPages(orgId, from, to, undefined, tpId)
  }
}

export const heatmapService =
  process.env.NODE_ENV !== 'production'
    ? new HeatmapService(heatmapRepo)
    : (globalThis._heatmapService ?? (globalThis._heatmapService = new HeatmapService(heatmapRepo)))
