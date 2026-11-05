'use client'

/**
 * ============================================================================
 * The privacy policy, the terms of service and the support page, from one component.
 * ============================================================================
 *
 * ⚠️ DRAFT — CHỦ SẢN PHẨM DUYỆT. The wording in `public/lang/{vi,en}/legal.json` is a standard
 * framework for a short-link + content-hosting SaaS, written against what this codebase ACTUALLY
 * collects (visit rows with IP and User-Agent, viewer emails in Google access mode, Casdoor,
 * Supabase, Google OAuth). It is not legal advice and has not been reviewed by a lawyer. The owner
 * signs it off before this is quoted anywhere binding.
 *
 * ⛔ AND THE DRAFT NOTICE STAYS OUT OF THE UI. These two URLs are what `op_policy_uri` and
 * `op_tos_uri` point a connector directory at (P0.5); a page that labelled itself a draft would be
 * read as "this product has no policy" by the one audience the links exist for.
 *
 * WHY ONE COMPONENT FOR BOTH: the two documents differ only in which key of the `legal` namespace
 * they read. A second copy of this layout would be the thing that drifts.
 *
 * WHY `useSuspense: false`: `legal` is not in the `ns` list `i18n-client.ts` initialises with, so it
 * is fetched on first render. With suspense on, that render throws a promise and the nearest boundary
 * is the root layout's — the whole page would blank. Reading `ready` instead keeps the fallback local
 * and the page mounted.
 */
import { useTranslation } from 'react-i18next'

/**
 * ⚠️ CHỦ SẢN PHẨM PHẢI XÁC NHẬN TRƯỚC KHI NỘP DIRECTORY — mục "Luật áp dụng và giải quyết tranh
 * chấp" (`terms.sections[11]` trong `public/lang/{vi,en}/legal.json`) hiện viết trung tính: pháp
 * luật Việt Nam, thương lượng 30 ngày, rồi "toà án có thẩm quyền tại Việt Nam". Ba thứ còn trống và
 * chỉ chủ sản phẩm điền được:
 *   1. PHÁP NHÂN ký hợp đồng này — tên công ty và mã số doanh nghiệp. Cả bộ tài liệu đang chỉ nói
 *      "Li2", chưa nêu một pháp nhân nào.
 *   2. ĐỊA CHỈ ĐĂNG KÝ của pháp nhân đó.
 *   3. TÀI PHÁN cụ thể — toà án tỉnh/thành nào, hoặc trọng tài (VIAC) nếu muốn thay toà án.
 * Directory review của ChatGPT và Claude đều đọc mục này, nên đừng nộp khi còn để trống. Không bịa
 * tên pháp nhân, địa chỉ hay số điện thoại vào JSON.
 */
export type LegalDocumentKind = 'privacy' | 'terms' | 'support'

interface LegalSection {
  heading: string
  body: string[]
}

/** `returnObjects` hands back the key itself if the namespace has not landed, so nothing is assumed. */
function sectionsOf(value: unknown): LegalSection[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is LegalSection =>
      typeof entry?.heading === 'string' && Array.isArray(entry?.body)
  )
}

export function LegalDocument({ kind }: { kind: LegalDocumentKind }) {
  const { t, ready } = useTranslation('legal', { useSuspense: false })
  const sections = sectionsOf(t(`${kind}.sections`, { returnObjects: true }))

  return (
    <main className="h-screen overflow-y-auto bg-background">
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {ready ? t(`${kind}.title`) : ''}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{ready ? t(`${kind}.updated`) : ''}</p>
        <p className="mt-6 text-base leading-7 text-foreground/90">
          {ready ? t(`${kind}.intro`) : ''}
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-7 text-foreground/80">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
