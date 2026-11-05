'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { parse } from 'tldts'
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'
export const logout = async (options?: { redirect_to?: string | null }) => {
  const cookiesStore = await cookies()

  // Clean up demo session cookie if present (Redis entry expires via 2h TTL)
  cookiesStore.delete('demo_session_id')

  const host = headers().get('x-forwarded-host') || headers().get('host')
  if (host && process.env.NODE_ENV !== 'development') {
    const domain = parse(host).domain
    cookiesStore.delete({
      name: 'casdoor_access_token',
      domain: `.${domain}`,
      path: '/',
    })
    cookiesStore.delete({
      name: 'casdoor_refresh_token',
      domain: `.${domain}`,
      path: '/',
    })
  } else {
    cookiesStore.delete('casdoor_access_token')
    cookiesStore.delete('casdoor_refresh_token')
  }
  cookiesStore.delete('supabase_access_token')
  cookiesStore.delete('oauth')

  const { redirect_to = '/auth/login' } = options || {}
  if (redirect_to) {
    redirect(redirect_to)
  }
}
export const setSupabaseToken = async (token: string) => {
  const cookiesStore = await cookies()
  cookiesStore.set('supabase_access_token', token, {
    secure: true,
    sameSite: 'lax',
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
}

export const setCasdoorToken = async (
  access_token: string,
  refresh_token: string,
  response?: NextResponse
) => {
  const today = dayjs()

  const tokenExpires = (
    process.env.NODE_ENV === 'development' ? today.add(1, 'hour') : today.add(1, 'day')
  )
    .subtract(5, 'minutes')
    .toDate()
  const refreshExpires = (
    process.env.NODE_ENV === 'development' ? today.add(24, 'hour') : today.add(7, 'day')
  )
    .subtract(5, 'minutes')
    .toDate()

  await setGlobalCookie('casdoor_access_token', access_token, {
    expires: tokenExpires,
    response,
  })
  await setGlobalCookie('casdoor_refresh_token', refresh_token, {
    expires: refreshExpires,
    response,
  })
}

export const setGlobalCookie = async (name: string, value: string, options?: {
  expires?: Date
  response?: NextResponse
}) => {
  const { response, expires } = options || {}
  const host = headers().get('x-forwarded-host') || headers().get('host')
  const cookiesStore = response ? response.cookies : await cookies()
  
  // `parse()` của psl trả `domain: null` cho mọi host KHÔNG có hậu tố công khai: `localhost`,
  // một địa chỉ IP, hay một tên một nhãn trong mạng nội bộ. Trước đây nhánh dưới vẫn chạy và
  // đặt `Domain=.null` — một domain không hợp lệ, nên trình duyệt **vứt cookie đi mà không báo
  // gì**. Triệu chứng: đăng nhập chạy tới `LOGIN_COMPLETED=true` rồi trang kế tiếp lại đá về
  // trang đăng nhập. Mất nhiều lượt thử mới thấy, vì không có lỗi nào được ghi.
  //
  // `.<domain>` chỉ cần cho triển khai nhiều subdomain (app. + api. dùng chung cookie). Một
  // host đơn lẻ không cần, và cookie không đặt `domain` thì mặc định gắn đúng host hiện tại —
  // chặt hơn chứ không lỏng hơn.
  const domain = host ? parse(host).domain : null

  if (domain && process.env.NODE_ENV !== 'development') {
    cookiesStore.set(name, value, {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expires: expires ? expires : undefined,
      domain: `.${domain}`,
      path: '/',
    })
  } else {
    // ⚠ `httpOnly` và `path` phải có ở đây nữa. Nhánh này trước chỉ chạy lúc dev nên thiếu cả
    // hai; nay nó phục vụ cả bản tự host trên một hostname đơn, tức là cookie phiên THẬT.
    // Thiếu `httpOnly` nghĩa là JavaScript bất kỳ trên trang đọc được token.
    cookiesStore.set(name, value, {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expires: expires ? expires : undefined,
      path: '/',
    })
  }
}