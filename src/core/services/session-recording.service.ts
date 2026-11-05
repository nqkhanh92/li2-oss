import { supabaseService } from '@/infrastructure/database/supabase'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import {
  sessionRecordingRepository,
  SessionRecordingRepository,
} from '../repositories/session-recording.repository'
import { SearchFilterPagination } from '@/shared/types'

export class SessionRecordingService {
  constructor(private repo: SessionRecordingRepository) {}

  async findAll(orgId: string, params: SearchFilterPagination) {
    await ensureOrgMember(orgId)
    return this.repo.findAll(orgId, params)
  }

  async findReplayData(orgId: string, sessionId: string) {
    await ensureOrgMember(orgId)
    const [chunks, session] = await Promise.all([
      this.repo.findChunksBySessionId(orgId, sessionId),
      this.repo.findSessionBySessionId(orgId, sessionId),
    ])

    const paths = chunks.map((c) => c.storage_path)
    const { data: signed, error } = await supabaseService.storage
      .from('org-recordings')
      .createSignedUrls(paths, 3600)
    if (error) throw error

    const chunkUrls = (signed ?? []).map((s) => s.signedUrl)
    return {
      chunkUrls,
      chunkCount: chunks.length,
      session,
      ip: session?.ip ?? null,
    }
  }

  async findPageSnapshots(
    orgId: string,
    hostname: string,
    pagePath: string,
    deviceType?: string,
    targetViewportWidth?: number,
  ) {
    await ensureOrgMember(orgId)
    const chunks = await this.repo.findRecentFirstChunksForPage(orgId, hostname, pagePath, 5, deviceType, targetViewportWidth)
    console.log('[page-snapshot] findPageSnapshots chunks:', chunks.length)
    if (chunks.length === 0) return { snapshots: [] }

    const paths = chunks.map((c) => c.storage_path)
    const { data: signed, error } = await supabaseService.storage
      .from('org-recordings')
      .createSignedUrls(paths, 3600)
    console.log('[page-snapshot] createSignedUrls', { paths, signed, error })
    if (error) throw error

    const signedMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
    console.log('[page-snapshot] signedMap keys:', [...signedMap.keys()])

    const snapshots = chunks.map((c) => ({
      session_id: c.session_id,
      started_at: c.started_at,
      page_url: c.page_url,
      chunk_url: signedMap.get(c.storage_path) ?? '',
      device_type: c.device_type ?? null,
      viewport_width: c.viewport_width ?? null,
    }))
    console.log('[page-snapshot] result snapshots:', snapshots)
    return { snapshots }
  }
}

export const sessionRecordingService =
  process.env.NODE_ENV !== 'production'
    ? new SessionRecordingService(sessionRecordingRepository)
    : (globalThis._sessionRecordingService ??
        (globalThis._sessionRecordingService = new SessionRecordingService(
          sessionRecordingRepository
        )))
