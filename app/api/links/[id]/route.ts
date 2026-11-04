import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { deactivateLink, publicUrl, updateLink } from '@/lib/links/service'

export const dynamic = 'force-dynamic'

const idSchema = z.string().uuid()

const patchSchema = z
  .object({
    destination: z.string().min(1).max(2048).optional(),
    title: z.string().max(200).optional().nullable(),
    is_active: z.boolean().optional(),
  })
  // Slug KHÔNG có trong schema này theo chủ ý — xem comment ở `prepareUpdate`.
  .strict()

/** Next 15: `params` là Promise. */
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 })

  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'id không phải UUID.' }, { status: 400 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join('; ') },
      { status: 400 }
    )
  }

  const result = await updateLink(id, {
    destination: parsed.data.destination,
    title: parsed.data.title,
    isActive: parsed.data.is_active,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ link: { ...result.data, public_url: publicUrl(result.data.slug) } })
}

/**
 * `DELETE` nhưng KHÔNG xoá hàng — chỉ đặt `is_active = false`.
 *
 * Trông như nói dối động từ HTTP, và đó là lựa chọn có ý thức: xoá thật sẽ kéo theo
 * `visits ON DELETE CASCADE` (mất sạch thống kê) và làm mọi QR đã in thành chết. Người bấm "xoá"
 * trong UI muốn "đừng phục vụ link này nữa", không muốn hai hệ quả kia. Response ghi rõ
 * `deactivated: true` để người gọi API không hiểu sai là đã xoá.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 })

  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'id không phải UUID.' }, { status: 400 })
  }

  const result = await deactivateLink(id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json({ deactivated: true, link: result.data })
}
