import { describe, expect, it } from 'vitest'

import {
  getRowDestination,
  getRowKind,
  getRowEditPath,
  getRowKindTileClass,
  getRowStatusBadge,
  isRemovedArtifact,
  isArtifactContentType,
  ROW_KIND_TILE_CLASS,
  ROW_KIND_TILE_MUTED_CLASS,
  stripProtocol,
} from '@/features/short-links/utils/row-kind'

describe('stripProtocol', () => {
  it('bỏ http và https', () => {
    expect(stripProtocol('https://a.vn/x')).toBe('a.vn/x')
    expect(stripProtocol('http://a.vn/x')).toBe('a.vn/x')
  })

  // Ca null KHÔNG đến từ `short_url` — cột đó là NOT NULL ở DB, và hàng duy nhất đáng ngờ
  // (org smoketest) có giá trị `''` chứ không phải NULL. Nó đến từ `content_value`, cột nullable.
  it('null/undefined/rỗng → chuỗi rỗng, không ném', () => {
    expect(stripProtocol(null)).toBe('')
    expect(stripProtocol(undefined)).toBe('')
    expect(stripProtocol('')).toBe('')
  })
})

describe('isArtifactContentType', () => {
  it('không phân biệt chữ hoa thường', () => {
    expect(isArtifactContentType('ARTIFACT')).toBe(true)
    expect(isArtifactContentType('artifact')).toBe(true)
  })

  it('null và URL đều không phải artifact', () => {
    expect(isArtifactContentType(null)).toBe(false)
    expect(isArtifactContentType('url')).toBe(false)
  })
})

const artifactRow = (kind: string | null) => ({
  content_type: 'ARTIFACT',
  artifact: kind === null ? null : ({ kind } as any),
})

describe('getRowKind', () => {
  it('content_type URL → ô loại LINK, họ url', () => {
    expect(getRowKind({ content_type: 'URL' })).toEqual({
      family: 'url',
      label: 'LINK',
      icon: 'link',
    })
  })

  it('html và markdown là "page" — thứ Li2 render ra trang đọc được', () => {
    expect(getRowKind(artifactRow('html'))).toEqual({
      family: 'page',
      label: 'page',
      icon: 'page',
    })
    expect(getRowKind(artifactRow('markdown'))).toEqual({
      family: 'page',
      label: 'page',
      icon: 'page',
    })
  })

  /**
   * `site` là giá trị thứ 9 của `artifacts_kind_check` và từng BỊ THIẾU khỏi bảng ánh xạ — nó rơi
   * vào nhánh mặc định và hiện ra là `FILE` (họ file, màu đỏ) trong khi nó là một trang.
   *
   * Ca này tách riêng khỏi hai ca trên chính vì thế: gộp nó vào danh sách `it.each` thì lần sau có
   * ai thêm kind mới mà quên, test vẫn chỉ nói "thiếu một dòng trong mảng".
   */
  it('site là họ page, KHÔNG tụt về FILE', () => {
    expect(getRowKind(artifactRow('site'))).toEqual({
      family: 'page',
      label: 'site',
      icon: 'site',
    })
  })

  it.each([
    ['pdf', 'PDF', 'pdf'],
    ['slides', 'SLIDE', 'slides'],
    ['document', 'DOC', 'document'],
    ['sheet', 'SHEET', 'sheet'],
    ['image', 'IMG', 'image'],
    ['video', 'VIDEO', 'video'],
  ])('%s → họ file, nhãn %s', (kind, label, icon) => {
    expect(getRowKind(artifactRow(kind))).toEqual({ family: 'file', label, icon })
  })

  /**
   * Khoá chính cái CHECK, không khoá cái bảng. 9 giá trị hợp lệ thì phải có 9 ánh xạ **tường
   * minh** — thêm giá trị vào DB mà quên file này thì ca dưới đỏ, chứ không im lặng hiện `FILE`.
   */
  it('cả 9 kind của artifacts_kind_check đều có ánh xạ riêng, không ai rơi về FILE', () => {
    const KINDS = [
      'html',
      'markdown',
      'pdf',
      'site',
      'slides',
      'document',
      'sheet',
      'image',
      'video',
    ]

    for (const k of KINDS) {
      expect(getRowKind(artifactRow(k)).icon, `kind "${k}" rơi về nhánh mặc định`).not.toBe('file')
    }
  })

  it('artifact có kind lạ KHÔNG được tụt về LINK', () => {
    const kind = getRowKind(artifactRow('hologram'))

    expect(kind.label).not.toBe('LINK')
    expect(kind).toEqual({ family: 'file', label: 'FILE', icon: 'file' })
  })

  it('artifact mất metadata (FK ON DELETE SET NULL) vẫn là artifact, không phải link', () => {
    const kind = getRowKind(artifactRow(null))

    expect(kind.label).not.toBe('LINK')
    expect(kind.family).not.toBe('url')
  })

  it('content_type quyết định, KHÔNG phải sự có mặt của artifact', () => {
    // Một link thường mà vì lý do nào đó có metadata artifact đi kèm vẫn phải hiện là LINK.
    const kind = getRowKind({ content_type: 'URL', artifact: { kind: 'pdf' } as any })

    expect(kind).toEqual({ family: 'url', label: 'LINK', icon: 'link' })
  })

  // LiHi có cả `URL` (3 hàng) và `url` (1 hàng, org smoketest). So khớp phân biệt chữ sẽ PASS trên
  // org test rồi nổ ở org khác — nên phải chốt bằng test, không dựa vào dữ liệu đang có.
  it.each(['ARTIFACT', 'artifact', 'Artifact'])('content_type "%s" đều là artifact', (ct) => {
    expect(getRowKind({ content_type: ct, artifact: { kind: 'pdf' } as any }).label).toBe('PDF')
  })

  it.each(['URL', 'url', 'Url'])('content_type "%s" đều là link', (ct) => {
    expect(getRowKind({ content_type: ct })).toEqual({
      family: 'url',
      label: 'LINK',
      icon: 'link',
    })
  })

  it('mọi họ đều có lớp màu riêng, không họ nào dùng chung', () => {
    const classes = Object.values(ROW_KIND_TILE_CLASS)

    expect(new Set(classes).size).toBe(classes.length)
  })
})

describe('hàng đã gỡ', () => {
  const removedPdf = {
    content_type: 'ARTIFACT',
    content_value: 'https://app/a/tok',
    name: 'Catalog',
    artifact: { kind: 'pdf', status: 'removed', size_bytes: 2516582 } as any,
  }

  it('ô loại xám đi, KHÔNG giữ màu họ', () => {
    const kind = getRowKind(removedPdf)

    expect(kind.muted).toBe(true)
    expect(getRowKindTileClass(kind)).toBe(ROW_KIND_TILE_MUTED_CLASS)
    expect(getRowKindTileClass(kind)).not.toBe(ROW_KIND_TILE_CLASS[kind.family])
  })

  it('nhãn ô loại GIỮ NGUYÊN "PDF" — nó từng là một PDF, badge mới là chỗ nói trạng thái', () => {
    expect(getRowKind(removedPdf).label).toBe('PDF')
  })

  it('hàng live KHÔNG bị xám', () => {
    const kind = getRowKind({ ...removedPdf, artifact: { kind: 'pdf', status: 'live' } as any })

    expect(kind.muted).toBeFalsy()
    expect(getRowKindTileClass(kind)).toBe(ROW_KIND_TILE_CLASS.file)
  })

  // "nội dung 2.4 MB" là lời nói dối: nội dung không còn, size_bytes chỉ là vết của thứ từng có.
  it('cột đích KHÔNG nói dung lượng, mà nói QR vẫn quét được', () => {
    const dest = getRowDestination(removedPdf)

    expect(dest.value).not.toContain('MB')
    expect(dest.labelKey).toBe('touchpoint:merged_list.destination.removed')
  })

  it('đích của hàng đã gỡ khác hẳn đích của hàng live cùng file', () => {
    const live = getRowDestination({
      ...removedPdf,
      artifact: { kind: 'pdf', status: 'live', size_bytes: 2516582 } as any,
    })

    expect(live.labelKey).not.toBe(getRowDestination(removedPdf).labelKey)
    expect(live.value).toBe('2.4 MB')
  })

  it('isRemovedArtifact: link thường không bao giờ là "đã gỡ"', () => {
    expect(isRemovedArtifact({ content_type: 'URL', artifact: { status: 'removed' } as any })).toBe(
      false
    )
    expect(isRemovedArtifact(removedPdf)).toBe(true)
  })
})

describe('getRowStatusBadge', () => {
  it('hàng live KHÔNG có badge — badge trên 23/26 hàng là badge không ai đọc', () => {
    expect(getRowStatusBadge({ artifact: { status: 'live' } as any })).toBeNull()
  })

  it('hàng link thường KHÔNG có badge', () => {
    expect(getRowStatusBadge({ artifact: null })).toBeNull()
    expect(getRowStatusBadge({})).toBeNull()
  })

  // 35 touch point trên LiHi có artifact `removed` nhưng QR vẫn phục vụ (410 + trang "đã gỡ").
  // Giữ chúng trong danh sách là đúng; để chúng trông y hệt hàng live thì không.
  it('hàng đã gỡ CÓ badge, và nói đúng trạng thái', () => {
    expect(getRowStatusBadge({ artifact: { status: 'removed' } as any })).toEqual({
      status: 'removed',
    })
  })

  it.each(['draft', 'blocked', 'expired', 'quarantined', 'scanning'])(
    'trạng thái %s cũng có badge, không chỉ removed',
    (status) => {
      expect(getRowStatusBadge({ artifact: { status } as any })).toEqual({ status })
    }
  )
})

describe('getRowDestination', () => {
  it('link: đích là URL được chuyển tới, đã bỏ giao thức', () => {
    const dest = getRowDestination({
      content_type: 'URL',
      content_value: 'https://adpia.vn/kiem-tien-online',
    })

    expect(dest).toEqual({
      labelKey: 'touchpoint:merged_list.destination.redirects_to',
      value: 'adpia.vn/kiem-tien-online',
    })
  })

  it('artifact: đích là dung lượng nội dung, không phải URL phục vụ', () => {
    const dest = getRowDestination({
      content_type: 'ARTIFACT',
      content_value: 'https://app.example.com/a/q1a35o5nf9saod87',
      name: 'Catalog thu đông 2026',
      artifact: { kind: 'pdf', size_bytes: 2516582 } as any,
    })

    expect(dest.value).toBe('2.4 MB')
    expect(dest.value).not.toContain('/a/')
  })

  it('đích KHÔNG được lặp lại tên — tên đã hiện ngay dòng trên trong cùng hàng', () => {
    const name = 'Catalog thu đông 2026'
    const dest = getRowDestination({
      content_type: 'ARTIFACT',
      content_value: 'https://app/a/t',
      name,
      artifact: { kind: 'pdf', size_bytes: 1048576 } as any,
    })

    expect(dest.value).not.toBe(name)
  })

  it('hai loại dùng khoá nhãn KHÁC nhau — một cột không được nói hai nghĩa mà không nhãn', () => {
    const link = getRowDestination({ content_type: 'URL', content_value: 'https://a.vn' })
    const artifact = getRowDestination({
      content_type: 'ARTIFACT',
      content_value: 'https://app/a/t',
      name: 'f.pdf',
    })

    expect(link.labelKey).not.toBe(artifact.labelKey)
  })

  it('artifact mất metadata thì lùi về URL phục vụ chứ không ra chuỗi rỗng', () => {
    const dest = getRowDestination({
      content_type: 'ARTIFACT',
      content_value: 'https://app.example.com/a/tok',
      name: 'x',
      artifact: null,
    })

    expect(dest.value).toBe('app.example.com/a/tok')
  })

  it('content_value null không làm vỡ', () => {
    expect(getRowDestination({ content_type: 'URL', content_value: null }).value).toBe('')
  })
})

describe('getRowEditPath — hai loại sửa ở hai trang', () => {
  it('short link → trang short link, theo touch_point id', () => {
    expect(getRowEditPath({ id: 'tp-1', content_type: 'URL' })).toBe('/short-links/tp-1?tab=detail')
  })

  /**
   * Ca này là lý do tồn tại của cả hàm. Trước đó mọi hàng đều đi về trang short link, nên bấm
   * "Sửa" trên một artifact mở ra trang nói về đích chuyển hướng và QR — không có chỗ nào thay
   * được file hay đổi quyền truy cập.
   */
  it('artifact → trang artifact, theo ARTIFACT id chứ không phải touch_point id', () => {
    const path = getRowEditPath({
      id: 'tp-1',
      content_type: 'ARTIFACT',
      artifact: { id: 'art-9', kind: 'pdf' } as any,
    })

    expect(path).toBe('/artifacts/art-9')
    // Dùng `row.id` sẽ ra một URL trông đúng và trả 404.
    expect(path).not.toContain('tp-1')
  })

  it.each(['ARTIFACT', 'artifact', 'Artifact'])('content_type "%s" đều đi trang artifact', (ct) => {
    expect(
      getRowEditPath({ id: 'tp-1', content_type: ct, artifact: { id: 'art-9' } as any })
    ).toBe('/artifacts/art-9')
  })

  /** FK `artifacts.touch_point_id` là ON DELETE SET NULL: artifact mất metadata vẫn còn touch
   *  point, và touch point vẫn phục vụ — nên lùi về trang short link, không để nút Sửa chết. */
  it('artifact mất metadata → lùi về trang short link, KHÔNG ra /artifacts/undefined', () => {
    const path = getRowEditPath({ id: 'tp-1', content_type: 'ARTIFACT', artifact: null })

    expect(path).toBe('/short-links/tp-1?tab=detail')
    expect(path).not.toContain('undefined')
  })

  it('link có kèm metadata artifact vẫn đi trang short link — content_type mới là nguồn quyết định', () => {
    expect(
      getRowEditPath({ id: 'tp-1', content_type: 'URL', artifact: { id: 'art-9' } as any })
    ).toBe('/short-links/tp-1?tab=detail')
  })
})
