import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from './with-auth'
import { withCors } from './with-cors'
import { isCasdoorAdmin } from '@/core/services/casdoor-admin.service'
import { isCasdoorDbConfigured } from '@/infrastructure/database/casdoor/pool'
import { logger } from '@/infrastructure/logging/logger'
import type { AuthContext } from '@/shared/types/request'

const log = logger.child({ service: 'with-admin' })

type HandlerCtx<P> = { params: P; context: AuthContext }
type RouteHandler<P> = (req: NextRequest, ctx: HandlerCtx<P>) => Promise<NextResponse | Response>

/**
 * Chỉ quản trị viên Casdoor mới qua được.
 *
 * `withAuth` chỉ chứng minh "đây là một người dùng Casdoor hợp lệ" — **mọi** người dùng đều qua.
 * Một endpoint thống kê toàn hệ thống mà chỉ có `withAuth` là ai đăng nhập cũng đọc được số liệu
 * của cả nền tảng. Đó đúng là hình dạng của sự cố authz trước đây, nên ở đây cộng thêm một tầng.
 *
 * Nguồn sự thật là cột `is_admin` trong DB Casdoor, không phải một claim trong token: claim do
 * token mang thì chỉ mới bằng cái token, còn cột DB thì đổi quyền là có hiệu lực ngay. Đổi lại,
 * mỗi lần gọi tốn một truy vấn — chấp nhận được với một bảng điều khiển admin.
 *
 * ⚠ **Fail closed.** Chưa cấu hình `CASDOOR_DB_URL` thì không tra được quyền, và khi không biết
 * ai là admin thì câu trả lời đúng là **từ chối**, không phải "cho qua vì chưa cấu hình".
 */
export const withAdmin = <P>(handler: RouteHandler<P>) =>
  withCors<P>(async (request, ctx) => {
    const inner = withAuth<P>(async (req, authCtx) => {
      if (!isCasdoorDbConfigured()) {
        log.warn({ userId: authCtx.context.userId }, 'admin gate unavailable: CASDOOR_DB_URL unset')
        return NextResponse.json(
          { error: 'Admin directory is not configured on this deployment' },
          { status: 503 }
        )
      }

      let admin = false
      try {
        admin = await isCasdoorAdmin(authCtx.context.userId, authCtx.context.email)
      } catch (error) {
        // Tra quyền hỏng ≠ có quyền. Lỗi hạ tầng không được biến thành một lần cho qua.
        log.error({ error, userId: authCtx.context.userId }, 'admin lookup failed')
        return NextResponse.json({ error: 'Could not verify administrator access' }, { status: 503 })
      }

      if (!admin) {
        log.warn({ userId: authCtx.context.userId }, 'non-admin blocked from admin route')
        return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
      }

      return handler(req, authCtx)
    })

    return inner(request, { params: ctx.params as Record<string, string | string[]> })
  })
