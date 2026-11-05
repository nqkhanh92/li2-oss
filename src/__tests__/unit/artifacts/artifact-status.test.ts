import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ACCEPTED_ARTIFACT_EXTENSIONS,
  ARTIFACT_FORMATS,
  ARTIFACT_STATUSES,
  type ArtifactStatus,
} from '@/core/types/artifact.type'

import {
  getArtifactBadgeClass,
  getArtifactStatusView,
} from '@/features/artifacts/utils/artifact-status'
import { getArtifactKindView } from '@/features/artifacts/utils/artifact-kind'
import { formatBytes } from '@/features/artifacts/utils/format-bytes'
import { artifactApiI18n, artifactApiStatus } from '@/features/artifacts/utils/api-error'
import {
  fileNameWithoutExtension,
  hasAcceptedExtension,
  isValidSlug,
  normalizeSlugInput,
  slugifyFileName,
  suggestedSlug,
  SLUG_MAX_LENGTH,
} from '@/features/artifacts/constants'

/**
 * Đọc thẳng từ `ARTIFACT_STATUSES` thay vì chép tay: bản chép tay đã từng là chỗ duy nhất phải sửa
 * khi union nở ra, và không gì nhắc ai sửa nó.
 */
const ALL_STATUSES: ArtifactStatus[] = [...ARTIFACT_STATUSES]

describe('getArtifactStatusView — phủ đủ 7 nhánh', () => {
  it.each([
    ['draft', 'neutral', 'publish'],
    ['scanning', 'info', null],
    ['live', 'success', 'replace'],
    ['blocked', 'error', 'reupload'],
    ['expired', 'warning', 'republish'],
    ['quarantined', 'error', 'appeal'],
    ['removed', 'neutral', null],
  ] as [ArtifactStatus, string, string | null][])(
    '%s → badge %s, hành động %s',
    (status, tone, actionKind) => {
      const view = getArtifactStatusView(status)
      expect(view.badge.tone).toBe(tone)
      expect(view.action?.kind ?? null).toBe(actionKind)
    }
  )

  it('mỗi status trả về một view, không nhánh nào rơi vào undefined', () => {
    for (const status of ALL_STATUSES) {
      expect(getArtifactStatusView(status)).toBeDefined()
    }
  })

  it('badge và nhãn hành động luôn có key dịch', () => {
    for (const status of ALL_STATUSES) {
      const view = getArtifactStatusView(status)
      expect(view.badge.labelKey).toMatch(/^status\./)
      if (view.action) expect(view.action.labelKey).toMatch(/^actions\./)
    }
  })

  /**
   * Wave 3: `live` có nút chính — thay nội dung giữ QR và short link. Trước đó ô này trống. Nếu ai
   * đưa `live` về `action: null` thì cách duy nhất để đổi nội dung đã in QR lại là Xoá + Tạo mới.
   */
  it('live có hành động replace với nhãn update_content', () => {
    expect(getArtifactStatusView('live').action).toEqual({
      kind: 'replace',
      labelKey: 'actions.update_content',
    })
  })

  it('blocked và quarantined khác nút chính — đó là lý do giữ hai nhánh riêng', () => {
    expect(getArtifactStatusView('blocked').action?.kind).not.toBe(
      getArtifactStatusView('quarantined').action?.kind
    )
  })

  it('live không cần dòng phụ, mọi trạng thái không-live đều nói hệ quả', () => {
    expect(getArtifactStatusView('live').noteKey).toBeNull()
    for (const status of ALL_STATUSES.filter((s) => s !== 'live')) {
      expect(getArtifactStatusView(status).noteKey).toBeTruthy()
    }
  })

  it('mỗi tone có class riêng, không tone nào rỗng', () => {
    for (const status of ALL_STATUSES) {
      expect(getArtifactBadgeClass(getArtifactStatusView(status).badge.tone)).toBeTruthy()
    }
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [-5, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024 * 3.25, '3.3 MB'],
    [5 * 1024 * 1024, '5 MB'],
  ] as [number, string][])('%s → %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('kiểm tra file trước khi gửi lên', () => {
  it.each([
    ['trang.html', true],
    ['trang.htm', true],
    ['TRANG.HTML', true],
    ['bao-cao.pdf', true],
    ['slide.pptx', true],
    ['slide.ppt', true],
    ['clip.mp4', true],
    ['clip.webm', true],
    ['clip.MOV', true],
    ['trang.docx', true],
    ['bang.xlsx', true],
    ['ghi-chu.md', true],
    ['anh.PNG', true],
    ['anh.webp', true],
    // Vẫn phải từ chối: .svg là XML chạy được script, cố tình không nhận (xem ARTIFACT_KIND_SPECS).
    ['logo.svg', false],
    ['nen.bmp', false],
    ['trang.html.exe', false],
    ['html', false],
  ] as [string, boolean][])('%s → %s', (fileName, accepted) => {
    expect(hasAcceptedExtension(fileName)).toBe(accepted)
  })

  /**
   * Cổng của ô chọn file và cổng của server phải nhận đúng cùng một tập đuôi. Bảng trên là
   * những ca người dùng gặp thật; phép so này là thứ bắt được lần thêm đuôi tiếp theo mà FE
   * quên — đúng lớp lỗi `SLUG_MAX_LENGTH` 60 vs 64 đã nổ một lần rồi.
   */
  it('nhận đúng tập đuôi của ARTIFACT_FORMATS, không thừa không thiếu', () => {
    expect([...ACCEPTED_ARTIFACT_EXTENSIONS].sort()).toEqual(
      [...new Set(ARTIFACT_FORMATS.map((f) => f.extension))].sort()
    )
    for (const ext of ACCEPTED_ARTIFACT_EXTENSIONS) {
      expect(hasAcceptedExtension(`file${ext}`)).toBe(true)
    }
  })
})

describe('tên và slug điền sẵn', () => {
  it('tên mặc định bỏ đuôi file, giống mặc định của backend', () => {
    expect(fileNameWithoutExtension('Báo cáo quý 4.html')).toBe('Báo cáo quý 4')
  })

  it.each([
    ['Báo cáo quý 4.html', 'bao-cao-quy-4'],
    ['Đơn hàng.htm', 'don-hang'],
    ['a  b__c.html', 'a-b-c'],
    ['---weird---.html', 'weird'],
  ])('%s → %s', (input, expected) => {
    expect(slugifyFileName(input)).toBe(expected)
  })

  it('cắt theo độ dài tối đa', () => {
    expect(slugifyFileName('a'.repeat(200) + '.html')).toHaveLength(SLUG_MAX_LENGTH)
  })

  it('lúc đang gõ thì giữ dấu gạch ở cuối', () => {
    expect(normalizeSlugInput('bao-cao-')).toBe('bao-cao-')
    expect(normalizeSlugInput('Báo Cáo!')).toBe('bao-cao-')
  })
})

/**
 * Hai trần quota của artifact cạn cùng một lúc (spec §6), và hai trục đó đòi hai hành động khác
 * hẳn nhau — xoá bớt artifact, hay chọn file nhỏ hơn. Backend đã nói rõ trục nào trong `key` và
 * `params`; nếu FE nuốt lỗi rồi hiện câu chung của mình thì đúng thông tin cần nhất bị mất.
 */
describe('đọc lỗi i18n của backend', () => {
  const quotaBytesError = {
    response: {
      status: 403,
      data: {
        error: true,
        message: 'Organization storage quota exceeded',
        i18nMessage: {
          key: 'common:messages.error.field_exceed_limit',
          params: { field: '$t(label.storage)', limit: 30 },
        },
      },
    },
  }

  it('lấy được khoá và params để hiện đúng trục vượt', () => {
    expect(artifactApiI18n(quotaBytesError)).toEqual({
      key: 'common:messages.error.field_exceed_limit',
      params: { field: '$t(label.storage)', limit: 30 },
    })
    expect(artifactApiStatus(quotaBytesError)).toBe(403)
  })

  it('phân biệt được hai trục quota — cùng 403, khác khoá', () => {
    const liveCountError = {
      response: {
        status: 403,
        data: {
          i18nMessage: {
            key: 'common:messages.error.field_exceed_number_limit',
            params: { field: '$t(label.artifact)', limit: 3 },
          },
        },
      },
    }
    expect(artifactApiI18n(liveCountError)?.key).not.toBe(artifactApiI18n(quotaBytesError)?.key)
  })

  /**
   * Trục live chuyển sang khoá riêng `artifact:errors.quota_live` vì template chung
   * `field_exceed_number_limit` không dùng được (caller `tags` truyền `limit` là một **nhãn**,
   * không phải con số). Hàm này phải **không quan tâm namespace** — nó chỉ chuyển tiếp `key` cho
   * `t()`, và `t()` mới là chỗ phân giải `artifact:` hay `common:`. Nếu ở đây có bất kỳ phép cắt
   * hay giả định tiền tố nào thì khoá mới sẽ im lặng rơi về câu chung.
   */
  it('chuyển tiếp nguyên vẹn khoá thuộc namespace artifact, không chỉ common', () => {
    const liveQuota = {
      response: {
        status: 403,
        data: { i18nMessage: { key: 'artifact:errors.quota_live', params: { limit: 3 } } },
      },
    }
    expect(artifactApiI18n(liveQuota)).toEqual({
      key: 'artifact:errors.quota_live',
      params: { limit: 3 },
    })
    expect(artifactApiStatus(liveQuota)).toBe(403)
  })

  it.each([
    ['lỗi mạng, không có response', new Error('Network Error')],
    ['response không có i18nMessage', { response: { status: 502, data: {} } }],
    ['i18nMessage không có key', { response: { data: { i18nMessage: { params: {} } } } }],
    ['undefined', undefined],
  ])('%s → null, để nơi gọi rơi về câu chung', (_label, error) => {
    expect(artifactApiI18n(error)).toBeNull()
  })
})

/**
 * Trần 10MB và `.mov` va nhau: một đoạn quay bằng iPhone gần như luôn vượt (spec §7 rủi ro 5),
 * nên đây là lỗi người dùng gặp thường xuyên nhất ở wave này. Câu chỉ nói "quá mức" bắt họ đi
 * tra file của mình nặng bao nhiêu; `{{size}}` là thứ biến "đã hỏng" thành "nén hay đổi file".
 * Placeholder biến mất khỏi bản dịch thì không gì gãy — chỉ là con số im lặng không hiện ra.
 */
describe('copy lỗi quá cỡ mang đủ hai con số, ở cả hai ngôn ngữ', () => {
  it.each(['vi', 'en'])('%s', (lang) => {
    const dict = JSON.parse(
      readFileSync(resolve(__dirname, `../../../../public/lang/${lang}/artifact.json`), 'utf8')
    )
    for (const key of ['file_too_large'] as const) {
      expect(dict.errors[key]).toContain('{{size}}')
      expect(dict.errors[key]).toContain('{{max}}')
    }
    expect(dict.create.too_large_video).toContain('{{size}}')
    expect(dict.create.too_large_video).toContain('{{max}}')
  })
})

/**
 * F3 trong spec. Slug tự sinh không hợp lệ thì ô đường dẫn để trống (`suggestedSlug`), và người
 * dùng không được nói vì sao — nên một tên file dài vô hại biến thành một ô trống khó hiểu.
 * Tên dài là chuyện thường ngày với PDF và video, đúng nhóm wave này vừa mở cửa cho.
 */
describe('slug tự sinh từ tên file dài vẫn publish được', () => {
  const longName = `${'a'.repeat(SLUG_MAX_LENGTH - 1)}-${'b'.repeat(20)}.pdf`

  it('cắt đúng vào một dấu gạch thì không để lại `-` ở cuối', () => {
    const slug = slugifyFileName(longName)
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(slug.endsWith('-')).toBe(false)
    expect(isValidSlug(slug)).toBe(true)
  })

  it('và vì nó hợp lệ nên ô đường dẫn được điền sẵn, không bỏ trống', () => {
    expect(suggestedSlug(longName)).not.toBe('')
  })

  /**
   * Quét mọi vị trí cắt có thể rơi vào dấu gạch, không chỉ một ca may mắn: chỉ cần một vị trí
   * sinh ra slug mà `slugSchema` từ chối là có một tên file thật sẽ hỏng.
   */
  it('không vị trí dấu gạch nào sinh ra slug bị slugSchema từ chối', () => {
    for (let i = 1; i < SLUG_MAX_LENGTH + 5; i++) {
      const name = `${'a'.repeat(i)}-${'b'.repeat(SLUG_MAX_LENGTH)}.mp4`
      const slug = slugifyFileName(name)
      expect(isValidSlug(slug), `hỏng ở vị trí gạch ${i}: "${slug}"`).toBe(true)
    }
  })
})

/**
 * Spec A6b: `toDTO` giữ nguyên giá trị `kind`/`status` lạ thay vì ép về một giá trị hợp lệ, nên
 * hai hàm view này là chỗ duy nhất chặn một hàng như vậy trước khi nó chạm DOM. Ép về
 * `'html'`/`'blocked'` ở server sẽ vô hiệu hoá đúng hai nhánh dưới đây và mời người dùng bấm một
 * nút trên hàng ta không hiểu.
 */
describe('giá trị ngoài union không làm vỡ giao diện', () => {
  it.each(['bogus', '', 'LIVE', 'markdown'])(
    'status lạ (%s) → badge trung tính, không nút, không dòng phụ',
    (status) => {
      const view = getArtifactStatusView(status)
      expect(view.badge.tone).toBe('neutral')
      expect(view.action).toBeNull()
      expect(view.noteKey).toBeNull()
    }
  )

  // 'markdown' rời danh sách này 2026-10-24: nó đã upload được, nên có icon và nhãn thật.
  it.each(['bogus', '', 'site'])('kind lạ (%s) → nhãn "không rõ định dạng"', (kind) => {
    const view = getArtifactKindView(kind)
    expect(view.labelKey).toBe('artifact:kind.unknown')
    expect(view.Icon).toBeTruthy()
  })

  /** Bảy status thật vẫn phải đi qua `switch`, không rơi nhầm vào nhánh không-rõ. */
  it('bảy status hợp lệ không rơi vào nhánh fallback', () => {
    for (const status of ALL_STATUSES) {
      const view = getArtifactStatusView(status)
      expect(view.badge.labelKey).toBe(`status.${status}.badge`)
    }
  })
})
