import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createLink, listLinks, publicUrl } from '@/lib/links/service'

export const dynamic = 'force-dynamic'

/**
 * ⚠ Mọi handler ở đây yêu cầu đăng nhập.
 *
 * "Single-tenant" chỉ bỏ được phép LỌC theo tổ chức, không bỏ được phép KIỂM đăng nhập. Bản
 * thương mại có 24 handler chat/AI gọi được bằng `curl` vì cờ `AI_CHAT` chỉ ẩn UI mà không gate
 * route — 4 trong số đó ghi dữ liệu. Ẩn nút không phải kiểm soát truy cập.
 */

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  slug: z.string().max(64).optional().nullable(),
  destination: z.string().min(1).max(2048),
  title: z.string().max(200).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 })

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tham số limit/offset không hợp lệ.' }, { status: 400 })
  }

  const links = await listLinks(parsed.data)

  return NextResponse.json({
    links: links.map((link) => ({ ...link, public_url: publicUrl(link.slug) })),
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON.' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join('; ') },
      { status: 400 }
    )
  }

  const result = await createLink({ ...parsed.data, createdBy: user.id })
  // Lỗi nghiệp vụ (slug trùng, URL đích sai scheme) là 400 — lỗi của người gửi, không phải 500.
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(
    { link: { ...result.data, public_url: publicUrl(result.data.slug) } },
    { status: 201 }
  )
}
