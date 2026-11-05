import 'server-only'

import { NextResponse } from 'next/server'

import { ARTIFACT_COMMON_HEADERS, ARTIFACT_LANDING_CSP } from '@/core/helpers/artifact-csp'
import { ARTIFACT_LANDING_COPY, landingLanguageFor } from '@/core/helpers/artifact-landing'
import { notFoundPage } from '@/core/helpers/artifact-gate-pages'

/**
 * MỘT response 404 cho toàn bộ mặt công khai của artifact.
 *
 * Ba đường vào khác nhau dùng chung đúng hàm này — `/a/<token>` sai token, `/<org>/<slug>` sai org
 * hoặc sai slug, và mọi đường lạ khác trên host artifact (middleware rewrite về `/a/not-found`). Ba
 * đường đó trước đây trả `new NextResponse('Not found')` ở ba chỗ riêng, và đó là hai vấn đề cùng lúc:
 * text thuần giữa một sản phẩm có theme, và ba chỗ để nội dung lệch nhau.
 *
 * Lệch nhau ở đây không chỉ là chuyện thẩm mỹ. Nếu "org không tồn tại" và "slug không tồn tại" trả về
 * hai trang khác nhau dù chỉ một ký tự, người ngoài quét `/<org>/<slug>` hàng loạt và đọc ra org nào
 * có thật. Một hàm duy nhất, không tham số nào mô tả nguyên nhân, là cách khiến điều đó không thể xảy
 * ra chứ không chỉ là "hiện tại chưa xảy ra".
 *
 * `ARTIFACT_LANDING_CSP` (không phải `artifactGateCsp`): trang này không có form, nên `form-action
 * 'none'` là đúng. Headers chung giữ nguyên — `Cache-Control: no-store` quan trọng vì một 404 bị cache
 * sẽ còn đó sau khi artifact được xuất bản thật.
 */
export function artifactNotFoundResponse(acceptLanguage: string | null) {
  const language = landingLanguageFor(acceptLanguage)
  return new NextResponse(notFoundPage(ARTIFACT_LANDING_COPY[language], language), {
    status: 404,
    headers: {
      ...ARTIFACT_COMMON_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': ARTIFACT_LANDING_CSP,
    },
  })
}
