import { describe, it, expect } from 'vitest'
import { chatToolsFor, confirmKind, needsConfirmation } from '@/core/agent/chat-tools'
import { MCP_TOOLS } from '@/core/mcp/tools'

/**
 * Lớp công cụ cho dock chat — chốt chủ sản phẩm 2026-10-29 ("mở đủ 18 tool").
 *
 * Cái đáng khoá ở đây không phải "có đủ tool không" mà là **phép biến đổi `org_id`**. Chat không
 * chọn org: token PASETO đã mang `org_id`, và `stripOrgId` trong `buildBackHopRequest` vứt tham số
 * đó trước khi lên dây. Nên nếu lược đồ vẫn đòi `org_id`, model bị bắt bịa một UUID rồi UUID đó bị
 * vứt — và một UUID bịa nằm trong bản ghi hội thoại đọc ra như trợ lý đang thao tác trên một tổ
 * chức khác.
 */

const ALL = chatToolsFor(['read', 'write'])

describe('chatToolsFor — bỏ org_id khỏi lược đồ', () => {
  it('⭐ không tool nào còn org_id trong properties', () => {
    const conOrgId = ALL.filter((t) => t.input_schema.properties?.org_id !== undefined)

    expect(conOrgId.map((t) => t.name)).toEqual([])
  })

  it('⭐ không tool nào còn org_id trong required', () => {
    const conOrgId = ALL.filter((t) => t.input_schema.required?.includes('org_id'))

    expect(conOrgId.map((t) => t.name)).toEqual([])
  })

  /**
   * ★ CA KHOÁ MỘT LỖI ĐÃ XẢY RA THẬT, 2026-10-29. Model trả về:
   *
   *     tools.5.custom.input_schema: input_schema does not support oneOf, allOf, or anyOf
   *     at the top level
   *
   * MCP chấp nhận `anyOf` ở gốc, Anthropic thì không. Và hậu quả không chỉ là tool đó hỏng —
   * **cả danh sách tool bị từ chối**, nên MỌI lượt chat chết, kể cả lượt chỉ hỏi số liệu.
   */
  it('⭐ không lược đồ nào còn anyOf/oneOf/allOf ở gốc', () => {
    const con = ALL.filter(
      (t) => t.input_schema.anyOf || t.input_schema.oneOf || t.input_schema.allOf
    )

    expect(con.map((t) => t.name)).toEqual([])
  })

  it('⭐ create_short_link phẳng mà vẫn giữ đủ trường của CẢ HAI chế độ', () => {
    const goc = MCP_TOOLS.find((t) => t.name === 'create_short_link')!
    const sau = ALL.find((t) => t.name === 'create_short_link')!
    const props = Object.keys(sau.input_schema.properties ?? {})

    // Hợp của hai nhánh, trừ org_id.
    const mongDoi = new Set<string>()
    for (const b of (goc.inputSchema.anyOf ?? [])) {
      for (const k of Object.keys(b.properties ?? {})) if (k !== 'org_id') mongDoi.add(k)
    }

    expect(new Set(props)).toEqual(mongDoi)
    expect(props).toContain('destination_url') // nhánh một link
    expect(props).toContain('destinations') // nhánh hàng loạt
    expect(props).not.toContain('org_id')
  })

  /**
   * `required` phải là GIAO của các nhánh. Lấy hợp thì một chế độ hợp lệ không thoả nổi lược đồ —
   * model sẽ bịa thêm trường của chế độ kia để qua cửa, rồi back-hop trả 400.
   */
  it('⭐ required chỉ giữ thứ nhánh nào cũng đòi', () => {
    const sau = ALL.find((t) => t.name === 'create_short_link')!

    expect(sau.input_schema.required).toEqual(['mode'])
  })

  it('mô tả chế độ được SINH RA từ nhánh, không gõ tay', () => {
    const sau = ALL.find((t) => t.name === 'create_short_link')!
    const desc = String(sau.input_schema.description ?? '')

    // Gõ tay thì một lần đổi lược đồ để lại câu mô tả sai, và model tin câu mô tả hơn là đoán.
    expect(desc).toContain('destination_url')
    expect(desc).toContain('destinations')
  })

  it('không đụng vào mảng gốc trong MCP_TOOLS', () => {
    // Phép biến đổi phải sao chép. Sửa tại chỗ thì máy chủ MCP mất org_id — và MCP THẬT SỰ cần nó.
    const goc = MCP_TOOLS.find((t) => t.name === 'get_top_links')!

    expect(goc.inputSchema.required).toContain('org_id')
  })
})

describe('chatToolsFor — ẩn và lọc theo quyền', () => {
  it('list_orgs bị ẩn (chat đã cố định một org)', () => {
    expect(ALL.map((t) => t.name)).not.toContain('list_orgs')
  })

  /**
   * ⛔ GỠ 2026-10-30 theo yêu cầu chủ sản phẩm: *"lihi AI có code luôn, dừng lại tính năng này"*.
   *
   * `publish_artifact` và `update_artifact` nhận một trường `html` **do chính model soạn**, rồi
   * đăng nó thành trang SỐNG trên tên miền của khách. Cộng với mục 5 (tạo thì làm ngay, không
   * hỏi), một câu nhắn dựng được một trang web chưa ai đọc qua — trên tên miền mang thương hiệu
   * khách. Nó đã xảy ra thật: artifact "Menu quán mẫu", public, 3058 byte.
   *
   * Khác hẳn mọi tool còn lại: `create_short_link` trỏ tới nội dung NGƯỜI KHÁC viết,
   * `publish_draft_artifact` đăng file NGƯỜI DÙNG tải lên. Chỉ hai tool này là model tự sinh nội
   * dung rồi tự xuất bản.
   */
  it('⛔ hai tool cho model TỰ VIẾT HTML đã bị gỡ khỏi chat', () => {
    const ten = ALL.map((t) => t.name)

    expect(ten).not.toContain('publish_artifact')
    expect(ten).not.toContain('update_artifact')
  })

  /**
   * ⭐ Phép kiểm THẬT, không phụ thuộc tên tool: không lược đồ nào còn nhận nội dung do model soạn.
   * Khoá theo tên thì một tool mới tên khác mà vẫn nhận `html` sẽ lọt; khoá theo hình dạng thì
   * không.
   */
  it('⭐ KHÔNG lược đồ nào còn nhận trường `html`', () => {
    const conHtml = ALL.filter((t) => t.input_schema.properties?.html !== undefined)

    expect(conHtml.map((t) => t.name)).toEqual([])
  })

  /**
   * ⚠ Nhưng chúng vẫn phải CÒN trong registry MCP: client MCP (Claude Desktop, ChatGPT) là một
   * thế khác — người dùng chủ động nối connector và thấy từng lời gọi tool. Chủ sản phẩm chưa nói
   * gì về mặt đó, nên gỡ luôn ở đấy là tự quyết hộ.
   */
  it('nhưng VẪN còn trong MCP_TOOLS — chỉ gỡ khỏi dock chat', () => {
    const mcp = MCP_TOOLS.map((t) => t.name)

    expect(mcp).toContain('publish_artifact')
    expect(mcp).toContain('update_artifact')
  })

  it('publish_draft_artifact ĐƯỢC GIỮ — đăng file người dùng tải lên, không phải model soạn', () => {
    expect(ALL.map((t) => t.name)).toContain('publish_draft_artifact')
  })

  it('hai tool tra tài liệu được GIỮ', () => {
    const ten = ALL.map((t) => t.name)

    expect(ten).toContain('find_li2_docs')
    expect(ten).toContain('get_doc_page')
  })

  it('token chỉ đọc KHÔNG thấy tool ghi nào', () => {
    const chiDoc = chatToolsFor(['read'])
    const tenGhi = MCP_TOOLS.filter((t) => t.requiredScope === 'write').map((t) => t.name)

    for (const ten of tenGhi) {
      expect(chiDoc.map((t) => t.name)).not.toContain(ten)
    }
    // Và vẫn còn tool đọc để dùng — lọc không được làm rỗng danh sách.
    expect(chiDoc.length).toBeGreaterThan(0)
  })

  it('mọi tool đều có mô tả — model đọc mô tả chứ không đọc tên', () => {
    const trong = ALL.filter((t) => !t.description || t.description.trim().length < 20)

    expect(trong.map((t) => t.name)).toEqual([])
  })
})

/**
 * ★ CỔNG XÁC NHẬN — tuyến phòng thủ DUY NHẤT nằm ngoài tầm với của prompt.
 *
 * Tiêu chí lọt vào cổng **không phải "ghi dữ liệu"** mà là **hậu quả không gỡ lại được bằng một
 * thao tác ngược**. Đổi tên thì đổi lại là xong; đổi đích đến thì ai quét QR trong lúc đó đã đi
 * sang chỗ khác rồi.
 *
 * Vì sao cổng phải ở code: tên link và tên artifact do người dùng đặt và đi nguyên văn vào kết
 * quả tool, tức vào ngữ cảnh model. Một thành viên org đặt tên link thành một câu ra lệnh rồi chờ
 * Owner mở chat là đủ. Cổng dựa vào prompt sẽ bị prompt khác lấn át; cổng ở đây chạy trước khi
 * tool chạy và không đọc gì từ model ngoài tên tool và tham số.
 */
describe('cổng xác nhận — xoá', () => {
  it('⭐ hai tool xoá luôn hỏi, không điều kiện', () => {
    expect(needsConfirmation('delete_short_link', { slug: 'a' })).toBe(true)
    expect(needsConfirmation('delete_artifact', { artifact_id: 'x' })).toBe(true)
    expect(needsConfirmation('delete_short_link')).toBe(true)
    expect(confirmKind('delete_artifact', {})).toBe('delete')
  })
})

describe('⭐ cổng xác nhận — đổi đích đến', () => {
  /**
   * Nguy hiểm HƠN xoá dù nghe nhẹ hơn: xoá làm QR chết và người quét thấy trang lỗi, còn đổi đích
   * thì QR vẫn chạy bình thường, chỉ là đưa người ta tới nơi khác. Không ai phát hiện.
   */
  it('update_short_link CÓ destination_url thì phải hỏi', () => {
    expect(needsConfirmation('update_short_link', { id: 'x', destination_url: 'https://xau.vn' })).toBe(true)
    expect(confirmKind('update_short_link', { id: 'x', destination_url: 'https://xau.vn' })).toBe('redirect')
  })

  /**
   * Nhưng CHỈ khi trường đó có mặt. Bắt mọi lần `update_short_link` phải hỏi sẽ biến việc đổi một
   * chữ trong tên thành một lần bấm — trái mục 5 đã chốt (sửa thì làm ngay).
   */
  const khongDoiDich: [Record<string, unknown>, string][] = [
    [{ id: 'x', name: 'tên mới' }, 'đổi tên'],
    [{ id: 'x', enabled: false }, 'tắt link'],
    [{ id: 'x', utm: { utm_source: 'email' } }, 'đổi UTM'],
    [{ id: 'x', destination_url: '' }, 'chuỗi rỗng không phải một lần đổi'],
  ]

  it.each(khongDoiDich)('KHÔNG hỏi khi %j (%s)', (args) => {
    expect(needsConfirmation('update_short_link', args)).toBe(false)
  })
})

describe('⭐ cổng xác nhận — mở khoá artifact', () => {
  it('set_artifact_access sang public thì phải hỏi', () => {
    expect(needsConfirmation('set_artifact_access', { artifact_id: 'a', mode: 'public' })).toBe(true)
    expect(confirmKind('set_artifact_access', { artifact_id: 'a', mode: 'public' })).toBe('open-access')
  })

  /**
   * Ba chế độ kia là SIẾT hoặc đổi ngang. Người dùng bị khoá ra ngoài thì họ nói ngay và mở lại là
   * xong; còn thứ đã ra ngoài thì khoá lại không thu về được.
   */
  it.each(['private', 'password', 'google'])('KHÔNG hỏi khi siết sang %s', (mode) => {
    expect(needsConfirmation('set_artifact_access', { artifact_id: 'a', mode })).toBe(false)
  })
})

describe('cổng xác nhận — KHÔNG mở rộng ra ngoài ba nhóm', () => {
  /**
   * Khoá cái KHÔNG nới. Ai đó "làm cho nhất quán" bằng cách bắt mọi tool ghi phải hỏi sẽ biến trải
   * nghiệm thành hỏi liên tục — trái đúng mục 5 (tạo luôn, đừng hỏi lại).
   */
  const khongGac: [string, Record<string, unknown>][] = [
    ['create_short_link', { destination_url: 'https://a.vn' }],
    ['publish_artifact', { html: '<p>x</p>' }],
    ['publish_draft_artifact', { artifact_id: 'a' }],
    ['set_artifact_slug', { artifact_id: 'a', slug: 'moi' }],
    ['set_short_link_slug', { id: 'x', slug: 'moi' }],
    ['update_artifact', { artifact_id: 'a', html: '<p>y</p>' }],
    ['get_top_links', { period_days: 7 }],
  ]

  it.each(khongGac)('%s KHÔNG hỏi', (tool, args) => {
    expect(needsConfirmation(tool, args)).toBe(false)
    expect(confirmKind(tool, args)).toBeNull()
  })

  /**
   * ⚠ Đăng MỚI một trang công khai thì không hỏi, dù `mode: 'public'` — mục 5 đã chốt tạo thì làm
   * ngay, và lúc đó chưa có nội dung nào đang được bảo vệ để mà mở ra. Chỉ MỞ KHOÁ một thứ đang
   * khoá mới là nới.
   */
  it('đăng mới công khai KHÁC với mở khoá thứ đang khoá', () => {
    expect(needsConfirmation('publish_draft_artifact', { artifact_id: 'a', access: { mode: 'public' } })).toBe(false)
    expect(needsConfirmation('set_artifact_access', { artifact_id: 'a', mode: 'public' })).toBe(true)
  })
})

describe('cổng xác nhận — tên tool trong danh sách phải có thật', () => {
  it('mọi tool được gác đều có thật trong registry', () => {
    const tenThat = new Set<string>(MCP_TOOLS.map((t) => t.name))
    const duocGac = ['delete_short_link', 'delete_artifact', 'update_short_link', 'set_artifact_access']

    // Một tên gõ sai ở đây không gây lỗi biên dịch, nó chỉ lặng lẽ không bao giờ khớp — tức là
    // cổng xác nhận biến mất mà không ai biết.
    expect(duocGac.filter((ten) => !tenThat.has(ten))).toEqual([])
  })
})
