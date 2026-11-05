export interface SessionRecording {
  id: string
  session_id: string
  visitor_id: string
  li2_cid: string | null
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  page_count: number | null
  entry_page: string | null
  exit_page: string | null
  referrer_domain: string | null
  recording_duration_ms: number | null
  is_bounce: boolean | null
  is_bot: boolean | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  device_type: string | null
  country: string | null
  region: string | null
  city: string | null
  created_at: string
}

export interface SessionRecordingListResponse {
  data: SessionRecording[]
  rowCount: number
}

export interface SessionDetail extends SessionRecording {
  entry_url: string | null
  exit_url: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  utm_id: string | null
}

export interface SessionReplayResponse {
  chunkUrls: string[]
  chunkCount: number
  session: SessionDetail | null
  ip: string | null
}
