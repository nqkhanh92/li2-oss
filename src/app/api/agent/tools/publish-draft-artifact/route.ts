/**
 * Write tool `publish_draft_artifact` — back-hop target.
 *
 * POST /api/agent/tools/publish-draft-artifact   body `{ artifact_id, slug?, domain_id?, access? }`
 *
 * ★ VÌ SAO TOOL NÀY TỒN TẠI. `publish_artifact` chỉ nhận HTML dạng chữ — mô tả của chính nó viết
 * *"no base64, no PDF or other formats — for those the user uploads in the Li2 app"*. Nên khi người
 * dùng kéo một file vào dock chat, trước ngày 2026-10-29 **không có tool nào đỡ**. Luồng mới:
 * `/api/agent/turn` nhận `multipart/form-data`, gọi `artifactService.create` để sinh một hàng
 * `draft` (file đã lên server, chưa ai xem được), rồi model gọi tool này để công bố.
 *
 * ⭐ KHÁC BIỆT THẬT SO VỚI `publish_artifact`, và là lý do không gộp hai tool: ở đây `access` được
 * áp **trước khi trang sống**. `artifactService.publish` ghi chế độ xem lên hàng còn `draft` rồi
 * mới tạo touch point, nên không có khoảnh khắc nào một trang đáng lẽ khoá lại đang mở. Đường
 * `publish_artifact` phải gọi `setAccess` lần hai SAU khi trang đã sống, nên nó buộc phải mang
 * trường `warning` cho ca lần gọi đó hỏng. Kết quả ở đây không cần trường đó, và không có nó.
 *
 * Route là điều phối thuần, như các anh em: cổng scope (cấu trúc, trong `withAgentAuth`), cổng gói,
 * `.strict()` parse, MỘT lời gọi service. Mọi phép kiểm — quota live, quota dung lượng, trạng thái
 * publish được, quy tắc mật khẩu 8–128 code point, khoá lạc quan `access_version` — nằm trong
 * `artifactService.publish`, không viết lại ở đây, nên chat không thể lệch khỏi dashboard.
 *
 * nodejs runtime: withAgentAuth → paseto-ts cần node crypto, không chạy edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { toArtifactToolResult } from '@/core/helpers/artifact-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { publishDraftArtifactInputSchema } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = publishDraftArtifactInputSchema.safeParse(body)
  // 400 trống: lược đồ đã nói hết những gì có thể nói về hình dạng, và một thông báo dựng từ các
  // issue của Zod có thể vọng mật khẩu lại trong trường `received`.
  if (!parsed.success) throw new BadRequestError()

  const { artifact_id, slug, domain_id, access } = parsed.data

  const dto = await artifactService.publish(orgId, context.userId, artifact_id, {
    slug,
    domain_id,
    // `access` là một đối tượng `{ mode, password }` ở tầng tool, nhưng service nhận hai trường
    // phẳng. Trải ra ở đây chứ không đổi lược đồ tool: hình dạng lồng là hình dạng `publish_artifact`
    // đã công bố, và hai tool anh em mà nhận `access` khác kiểu nhau thì model sẽ gọi sai một trong
    // hai.
    access_mode: access?.mode,
    password: access?.password,
  })

  // SAU thay đổi và không `await` — hàng audit đáng có, không đáng để làm hỏng một lần ghi đã xong.
  recordArtifactAudit({
    orgId,
    userId: context.userId,
    artifactId: artifact_id,
    action: 'create',
    tool: 'publish_draft_artifact',
    clientId: agent.clientId,
    surface: agent.surface,
  })

  return APIResponse.created({ data: toArtifactToolResult(dto) })
})
