import { NextRequest } from 'next/server'
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { serveArtifactGet, serveArtifactPost } from '../_lib/serve'

/**
 * `/a/<token>` — đường nội bộ của app: iframe xem trước, `/file`, `/download`, form mật khẩu, và
 * đích 302 của short link. Thân xử lý nằm ở `../_lib/serve.ts`, dùng chung với địa chỉ công khai
 * `/<org_slug>/<slug>` trên host artifact (`../s/[org_slug]/[slug]/route.ts`).
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await artifactServeService.resolveTargetByToken(params.token)
  return serveArtifactGet(request, lookup, params.token, null)
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  return serveArtifactPost(request, params.token)
}

/**
 * Without this, `base-server.js` takes the `isSSG` branch, calls `response.blob()` and buffers the
 * whole body to cache it — which for a 10MB video undoes the streaming this route depends on.
 */
export const dynamic = 'force-dynamic'

/**
 * A DELETED ARTIFACT KEPT BEING SERVED. Measured on LiHi, 2026-09-30.
 *
 * The row, the storage object and the touch point were all gone, the UI said the artifact was
 * deleted — and `/a/<token>` still answered **200 with the full original body**. Anyone holding the
 * token kept reading content the owner had deleted. If the reason for deleting was "this should
 * never have been published", the delete did not achieve it, and nothing in the UI said so.
 *
 * The cause is NOT the delete logic, which is correct. Next.js writes the PostgREST fetch response
 * into its **on-disk** Data Cache (`/app/.next/cache/fetch-cache/`), keyed by the request URL — and
 * that URL carries `serve_token=eq.<token>`, so the very first public request warms an entry that
 * nothing later invalidates. `docker restart` does not clear it; only a new container filesystem
 * does. Proven by `--force-recreate`: same build, same database, cache gone → 404, while a live
 * artifact stayed 200 as the control.
 *
 * `dynamic = 'force-dynamic'` above does NOT prevent this. It governs how the route renders, not
 * whether `fetch` inside it consults the Data Cache. `fetchCache` is the knob that does, and
 * `force-no-store` applies to every fetch in this segment regardless of what the caller passed —
 * which matters because the caller here is `supabase-js` deep inside `artifactRepo`, and it passes
 * nothing.
 *
 * SCOPE, STATED HONESTLY: this fixes the public serve path only. The same staleness is reachable
 * anywhere else that reads through `supabaseService` — `getServiceClient()` sets no fetch option at
 * all, and no file under `src/infrastructure/database/` uses `no-store`. Fixing it at that layer
 * was considered and deliberately deferred (the blast radius is every repository); recorded as debt
 * in log.md. A unit test cannot prove this line works — only a real request after a real delete on
 * a real deployment can, which is why it is verified on LiHi rather than in CI.
 */
export const fetchCache = 'force-no-store'
