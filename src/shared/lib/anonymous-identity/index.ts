/**
 * Danh tính cho một THIẾT BỊ ẩn danh, sinh LÚC ĐỌC từ `visits.fp`.
 *
 * Vì sao không lưu vào DB: `visits` do li2-be (Go) ghi, li2-app không chen vào được lúc ghi. Mà
 * tên và avatar ở đây là hàm THUẦN của `fp` — cùng `fp` luôn ra cùng kết quả — nên lưu chỉ thêm
 * một bản sao có thể lệch. Không migration, không INSERT `customer_profiles`.
 *
 * ⚠ `fp` là dấu vết của THIẾT BỊ, không phải của người. Xoá cookie, đổi máy, đổi trình duyệt là ra
 * `fp` mới. Nên số danh tính ở đây LUÔN ≥ số người thật, và mọi nhãn hiển thị phải nói "thiết bị".
 *
 * Không `crypto`, không `Buffer`: file này chạy cả ở service (Node) và ở component (browser).
 */

/** 20 con vật × 8 tính từ = 160 tổ hợp, trước khi tính mã ngắn 4 ký tự hex (65536 giá trị). */
const ANIMALS = [
  'Cáo',
  'Mèo',
  'Sóc',
  'Rùa',
  'Cú',
  'Hạc',
  'Hổ',
  'Gấu',
  'Cá Voi',
  'Chim Sẻ',
  'Ngựa',
  'Sói',
  'Dê Núi',
  'Thỏ',
  'Nhím',
  'Cò',
  'Hươu',
  'Chồn',
  'Én',
  'Trâu',
] as const

const ADJECTIVES = [
  'Lặng Lẽ',
  'Tò Mò',
  'Thong Dong',
  'Mải Mê',
  'Bí Ẩn',
  'Rực Rỡ',
  'Kiên Nhẫn',
  'Lanh Lợi',
] as const

export const ANONYMOUS_NAME_COMBINATIONS = ANIMALS.length * ADJECTIVES.length

/** Nền avatar: 12 màu đủ cách nhau về sắc để nhận ra ngay ở kích thước 20px. */
const AVATAR_PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
] as const

const SHAPE_KINDS = ['circle', 'square', 'triangle'] as const

export type AnonymousAvatarShapeKind = (typeof SHAPE_KINDS)[number]

export interface AnonymousAvatarShape {
  kind: AnonymousAvatarShapeKind
  /** Toạ độ tâm trong hệ 80×80. */
  cx: number
  cy: number
  size: number
  rotation: number
  fill: string
  opacity: number
}

export interface AnonymousAvatar {
  /** Hệ toạ độ cố định — component chỉ đổi `width`/`height`. */
  viewBoxSize: number
  background: string
  shapes: AnonymousAvatarShape[]
}

export interface AnonymousIdentity {
  /** 4 ký tự hex lấy từ `fp`, để phân biệt hai thiết bị tình cờ trùng tên. */
  code: string
  animal: string
  adjective: string
  /** Ví dụ `Cáo Lặng Lẽ #a3f9`. */
  name: string
  avatar: AnonymousAvatar
}

/** FNV-1a 32-bit. Chọn nó vì ngắn, thuần, và không phụ thuộc môi trường. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 — cùng seed thì cùng chuỗi số, nên avatar tái lập được. */
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildAvatar(fp: string): AnonymousAvatar {
  const random = createRandom(fnv1a(`avatar:${fp}`))
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]

  const backgroundIndex = Math.floor(random() * AVATAR_PALETTE.length)
  const accentIndex =
    (backgroundIndex + 3 + Math.floor(random() * 6)) % AVATAR_PALETTE.length

  const shapes: AnonymousAvatarShape[] = []
  for (let i = 0; i < 3; i++) {
    shapes.push({
      kind: pick(SHAPE_KINDS),
      cx: 10 + Math.floor(random() * 4) * 20,
      cy: 10 + Math.floor(random() * 4) * 20,
      size: 14 + Math.floor(random() * 3) * 9,
      rotation: Math.floor(random() * 4) * 22.5,
      fill: i === 1 ? '#ffffff' : AVATAR_PALETTE[accentIndex],
      opacity: [0.9, 0.75, 0.6][i],
    })
  }

  return {
    viewBoxSize: 80,
    background: AVATAR_PALETTE[backgroundIndex],
    shapes,
  }
}

/** Danh tính của một thiết bị. Hàm thuần: cùng `fp` → cùng tên, cùng avatar, mọi lần gọi. */
export function anonymousIdentity(fp: string): AnonymousIdentity {
  const seed = fnv1a(`name:${fp}`)
  const animal = ANIMALS[seed % ANIMALS.length]
  const adjective = ADJECTIVES[Math.floor(seed / ANIMALS.length) % ADJECTIVES.length]
  const code = fnv1a(`code:${fp}`).toString(16).padStart(8, '0').slice(-4)

  return {
    code,
    animal,
    adjective,
    name: `${animal} ${adjective} #${code}`,
    avatar: buildAvatar(fp),
  }
}

/** Chỉ cái tên — cho tầng service, nơi không cần avatar (vd lọc theo từ khoá). */
export function anonymousDeviceName(fp: string): string {
  return anonymousIdentity(fp).name
}

/**
 * Avatar dạng chuỗi SVG, cho chỗ không render React được (email, export, test).
 * Trong UI dùng `<AnonymousAvatar />` để React tự dựng node.
 */
export function anonymousAvatarSvg(fp: string, size = 40): string {
  const { avatar, name } = anonymousIdentity(fp)
  const body = avatar.shapes.map(shapeToSvg).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${avatar.viewBoxSize} ${avatar.viewBoxSize}" role="img" aria-label="${name}">` +
    `<rect width="${avatar.viewBoxSize}" height="${avatar.viewBoxSize}" fill="${avatar.background}"/>` +
    `${body}</svg>`
  )
}

function shapeToSvg(shape: AnonymousAvatarShape): string {
  const transform = `rotate(${shape.rotation} ${shape.cx} ${shape.cy})`
  const common = `fill="${shape.fill}" opacity="${shape.opacity}" transform="${transform}"`
  if (shape.kind === 'circle') {
    return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.size / 2}" ${common}/>`
  }
  if (shape.kind === 'square') {
    return (
      `<rect x="${shape.cx - shape.size / 2}" y="${shape.cy - shape.size / 2}" ` +
      `width="${shape.size}" height="${shape.size}" ${common}/>`
    )
  }
  return `<polygon points="${trianglePoints(shape)}" ${common}/>`
}

export function trianglePoints(shape: AnonymousAvatarShape): string {
  const half = shape.size / 2
  return [
    `${shape.cx},${shape.cy - half}`,
    `${shape.cx + half},${shape.cy + half}`,
    `${shape.cx - half},${shape.cy + half}`,
  ].join(' ')
}
