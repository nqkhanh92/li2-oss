import { describe, expect, it } from 'vitest'

import {
  malformedUuidFilterKeys,
  TOUCH_POINT_LIST_FILTER_KEYS,
  unknownFilterKeys,
} from '@/app/api/organizations/[org_id]/touch-points/list-filters'
import { NO_CUSTOM_DOMAIN } from '@/core/helpers/merged-status'

/** UUID thật, lấy từ bảng `domains` của LiHi. */
const UUID_THAT = '66038997-6068-480a-8f16-337e7e292a27'

/**
 * Ba vế, và vế thứ ba mới là vế cứu người.
 *
 * 1. Khoá lạ KHÔNG giết endpoint — nó bị nêu tên.
 * 2. Mọi khoá thật VẪN đi qua — thiếu vế này thì một allowlist sót khoá sẽ xanh hết, và bộ lọc
 *    bị bỏ rơi sẽ trả về hàng sai trong im lặng. Im lặng tệ hơn 500.
 * 3. Allowlist phải PHỦ ĐỦ mọi khoá mà các nơi gọi thật đang gửi, và danh sách kỳ vọng ở đây
 *    được viết ra từ phép đo 9 nơi gọi `useGetTouchPoints`, không chép từ code đang kiểm.
 *
 * Vế 3 là bài học vòng 6 áp vào một bảng cấu hình mới: test trên *kết quả hàm* không khoá được
 * bất biến của *bảng* mà nơi khác cũng đọc. Phải khoá chính bảng đó.
 */

/**
 * Đo từ 9 nơi gọi `useGetTouchPoints` (2026-10-27):
 *
 * - `tag_ids` `collection_id` `created_at` — link-list, qr-list, nfc-list, select-touchpoints
 * - `excludeIds` — chỉ select-touchpoints
 * - `domain_id` `row_type` `status` — thanh công cụ danh sách gộp
 *
 * KHÔNG nằm trong `filters` nên không thuộc danh sách: `search`, `pagination`, `sorting`,
 * `editableOnly`, `excludeCollectionId` (query param riêng), và `content_value`/`slug` (tên ô
 * form ở hai màn onboarding, không phải khoá lọc).
 */
const KHOA_CAC_NOI_GOI_THAT_GUI = [
  'tag_ids',
  'collection_id',
  'created_at',
  'excludeIds',
  'domain_id',
  'row_type',
  'status',
]

describe('vế 1 — khoá lạ bị nêu tên, không làm chết endpoint', () => {
  it('nêu đúng khoá lạ', () => {
    expect(unknownFilterKeys({ merged_status: 'live' })).toEqual(['merged_status'])
  })

  it('nêu ĐỦ mọi khoá lạ, không chỉ cái đầu', () => {
    expect(unknownFilterKeys({ a: 1, status: 'live', b: 2 })).toEqual(['a', 'b'])
  })

  it('giá trị lạ của khoá HỢP LỆ thì không sao — chỉ xét tên khoá', () => {
    expect(unknownFilterKeys({ status: 'khong_phai_trang_thai' })).toEqual([])
  })

  it('không có filters thì không có khoá lạ', () => {
    expect(unknownFilterKeys(undefined)).toEqual([])
    expect(unknownFilterKeys(null)).toEqual([])
    expect(unknownFilterKeys({})).toEqual([])
  })
})

describe('vế 2 — mọi khoá thật vẫn đi qua', () => {
  it.each(KHOA_CAC_NOI_GOI_THAT_GUI)('%s được chấp nhận', (key) => {
    expect(unknownFilterKeys({ [key]: 'x' })).toEqual([])
  })

  it('gửi tất cả cùng lúc vẫn qua hết', () => {
    const all = Object.fromEntries(KHOA_CAC_NOI_GOI_THAT_GUI.map((k) => [k, 'x']))

    expect(unknownFilterKeys(all)).toEqual([])
  })
})

describe('vế 3 — allowlist phủ đủ các nơi gọi thật', () => {
  /**
   * Kiểm nghịch nhắm vào đây: bỏ một khoá thật khỏi `TOUCH_POINT_LIST_FILTER_KEYS` thì test này
   * phải ĐỎ. Nếu nó xanh thì chính bộ test đang che đúng cái hỏng im lặng.
   */
  it('không khoá nào của nơi gọi thật bị bỏ sót', () => {
    const thieu = KHOA_CAC_NOI_GOI_THAT_GUI.filter(
      (key) => !(TOUCH_POINT_LIST_FILTER_KEYS as readonly string[]).includes(key)
    )

    expect(thieu).toEqual([])
  })

  /**
   * ⚠ `created_at` và `excludeIds` bị `queryBuilderByParams` tự `delete` ở tầng dưới. Dễ nghĩ là
   * thừa rồi gỡ khỏi allowlist — nhưng danh sách này nói "khoá nào HỢP LỆ", độc lập với tầng
   * dưới. Gỡ đi thì ngày ai đó sửa `utils.ts`, endpoint sẽ 400 cho một khoá vẫn đang dùng.
   */
  it.each(['created_at', 'excludeIds'])('%s vẫn nằm trong allowlist dù tầng dưới tự xoá', (key) => {
    expect(TOUCH_POINT_LIST_FILTER_KEYS as readonly string[]).toContain(key)
  })

  it('allowlist không có khoá trùng', () => {
    expect(new Set(TOUCH_POINT_LIST_FILTER_KEYS).size).toBe(TOUCH_POINT_LIST_FILTER_KEYS.length)
  })

  /**
   * `content_type` là khoá mà nhánh agent (`/api/agent/tools/list-short-links`) gửi — nhưng nó
   * dựng `queryParams` Ở SERVER, không qua endpoint này. Nếu nó lọt vào allowlist thì nghĩa là
   * ai đó đã siết nhầm tầng, hoặc đang mở một khoá HTTP không ai gửi.
   */
  it('content_type KHÔNG nằm trong allowlist của endpoint HTTP', () => {
    expect(TOUCH_POINT_LIST_FILTER_KEYS as readonly string[]).not.toContain('content_type')
  })
})

/**
 * Nửa lỗ thứ hai: khoá ĐÚNG, giá trị sai **kiểu**. Bốn khoá so thẳng với cột `uuid`, và một chuỗi
 * không phải UUID làm PostgREST ném → 500.
 *
 * ⚠ Bốn, không phải ba. `excludeIds` cũng dính dù nó đi qua `.not('id','in',…)` chứ không phải
 * `.match()` — đếm từ danh sách khoá là đoán, phép đo mới ra con số.
 */
describe('vế 4 — khoá UUID có giá trị sai hình dạng', () => {
  it.each(['tag_ids', 'domain_id', 'collection_id', 'excludeIds'])(
    '%s nhận chuỗi không phải UUID → bị nêu tên',
    (key) => {
      expect(malformedUuidFilterKeys({ [key]: 'khong-co' })).toEqual([key])
    }
  )

  it.each(['tag_ids', 'domain_id', 'collection_id', 'excludeIds'])(
    '%s nhận UUID thật → qua',
    (key) => {
      expect(malformedUuidFilterKeys({ [key]: UUID_THAT })).toEqual([])
    }
  )

  it('mảng có MỘT phần tử sai vẫn bị từ chối — chín cái đúng không cứu được', () => {
    expect(malformedUuidFilterKeys({ tag_ids: [UUID_THAT, 'sai'] })).toEqual(['tag_ids'])
  })

  it('mảng toàn UUID thật thì qua', () => {
    expect(malformedUuidFilterKeys({ tag_ids: [UUID_THAT, UUID_THAT] })).toEqual([])
  })

  /**
   * `setFilter(key, null)` là cách giao diện XOÁ một bộ lọc. Coi đó là lỗi thì bấm "Xoá bộ lọc"
   * sẽ trả 400 — biến một thao tác bình thường thành lỗi.
   */
  it.each([null, undefined, '', []])('giá trị rỗng (%s) KHÔNG phải lỗi', (v) => {
    expect(malformedUuidFilterKeys({ tag_ids: v })).toEqual([])
  })

  /**
   * `__no_custom_domain__` không phải UUID nhưng là giá trị HỢP LỆ của ô lọc "Domain hệ thống"
   * (lọc `domain_id IS NULL`). Không chừa chỗ cho nó thì một ô lọc đang chạy bắt đầu trả 400.
   */
  it('domain_id nhận giá trị quy ước của "Domain hệ thống"', () => {
    expect(malformedUuidFilterKeys({ domain_id: NO_CUSTOM_DOMAIN })).toEqual([])
  })

  it('giá trị quy ước đó KHÔNG mở cho khoá khác', () => {
    expect(malformedUuidFilterKeys({ tag_ids: NO_CUSTOM_DOMAIN })).toEqual(['tag_ids'])
  })

  /**
   * ⚠ CỐ Ý không kiểm kiểu cho `status` và `created_at`: chúng được code ứng dụng xử lý trước khi
   * xuống SQL nên giá trị lạ đã vô hại (200, bỏ qua). Siết thêm là thay một thứ đang chạy bằng
   * một thứ chặt hơn mà không ai cần.
   */
  it.each(['status', 'created_at'])('%s KHÔNG bị kiểm kiểu', (key) => {
    expect(malformedUuidFilterKeys({ [key]: 'gia_tri_la' })).toEqual([])
  })

  it('nêu đủ nhiều khoá sai cùng lúc', () => {
    expect(malformedUuidFilterKeys({ tag_ids: 'a', domain_id: 'b' })).toEqual([
      'tag_ids',
      'domain_id',
    ])
  })
})
