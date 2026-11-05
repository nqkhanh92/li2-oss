/**
 * Maximum artifact upload size, in bytes.
 *
 * SINGLE SOURCE OF TRUTH — and it now has FOUR gates to agree with, not two. A number that passes
 * one and is rejected by the next produces an error the user cannot act on:
 *
 *   1. this constant                                  (service validation + the file picker)
 *   2. `storage.buckets.file_size_limit`               (supabase/migrations/…_artifacts__multiformat.sql)
 *   3. `client_max_body_size` of the reverse proxy     (nginx/app.example.conf — nginx defaults to 1MB)
 *   4. `FILE_SIZE_LIMIT` of the storage container      (global, outside this repo)
 *
 * Gates 3 and 4 live outside TypeScript and outside SQL, so no test in this repo can assert them.
 * See `docs/artifact-multiformat-findings.md` §2.3 and §5.
 *
 * This module is pure types + constants, so the frontend can import it without dragging server-only
 * code into the client bundle (which is why this does NOT live in `artifact.service.ts`).
 */
export const ARTIFACT_MAX_BYTES = 10 * 1024 * 1024

/**
 * Full vocabulary of the `artifacts_kind_check` CHECK constraint — wider than what can be uploaded
 * today, because widening a CHECK later is a migration nobody remembers to write. `markdown` and
 * `site` have no upload path yet.
 *
 * Array first, type derived from it — not the other way round. A bare TS union does not exist at
 * runtime, so nothing can compare it against the CHECK constraint in the migration, and nothing can
 * validate a value read back from the database. With the array, a contract test does both.
 */
export const ARTIFACT_KINDS = [
  'html',
  'markdown',
  'pdf',
  'site',
  'slides',
  'document',
  'sheet',
  'image',
  'video',
] as const
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]

/** The kinds a user can actually upload today. A subset of ARTIFACT_KINDS, on purpose. */
export const ARTIFACT_UPLOAD_KINDS = [
  'html',
  'markdown',
  'pdf',
  'slides',
  'document',
  'sheet',
  'image',
  'video',
] as const
export type ArtifactUploadKind = (typeof ARTIFACT_UPLOAD_KINDS)[number]

/**
 * `removed` là bia mộ: người dùng đã gỡ nội dung, file đã xoá khỏi kho, hàng còn lại chỉ để
 * `/a/<token>` biết token này TỪNG phục vụ nội dung và trả 410 thay vì 404. Nó không tái dùng
 * `expired` (hết hạn tự động) hay `quarantined` (hệ thống gỡ vì an toàn) — cả hai nói sai về ai đã
 * quyết. Xem `supabase/migrations/20261001000001_artifacts__removed_status.sql`.
 */
export const ARTIFACT_STATUSES = [
  'draft',
  'scanning',
  'live',
  'blocked',
  'expired',
  'quarantined',
  'removed',
] as const
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number]

/**
 * Ai xem được `/a/<token>` — từ vựng của CHECK `artifacts_access_mode_check`
 * (`20261006000001_artifacts__access_control.sql`). Mảng trước, type suy ra sau, cùng lý do với
 * `ARTIFACT_KINDS`: contract test so mảng này với CHECK, và route kiểm giá trị đọc từ DB.
 *
 * - `public`   — bất kỳ ai có link. Mặc định, và là hành vi hôm nay của mọi hàng đang có.
 * - `private`  — thành viên tổ chức chủ artifact, sau khi đăng nhập li2 (cookie Casdoor).
 * - `password` — ai biết mật khẩu; chủ artifact tự gửi mật khẩu cho họ.
 * - `google`   — ai có tài khoản Google; email được ghi lại cho chủ. Pha 2, gated bằng env
 *                `ARTIFACT_GOOGLE_CLIENT_ID`/`_SECRET` — thiếu env thì API từ chối và UI ẩn.
 */
export const ARTIFACT_ACCESS_MODES = ['public', 'private', 'password', 'google'] as const
export type ArtifactAccessMode = (typeof ARTIFACT_ACCESS_MODES)[number]

export const isArtifactAccessMode = (v: unknown): v is ArtifactAccessMode =>
  typeof v === 'string' && (ARTIFACT_ACCESS_MODES as readonly string[]).includes(v)

/** Đếm theo code point sau `trim()`. 8 là chốt của chủ sản phẩm (spec §8.13); không schema nào khác
 *  trong repo đặt mức này nên không có gì để nhất quán theo. */
export const ARTIFACT_PASSWORD_MIN_LENGTH = 8
export const ARTIFACT_PASSWORD_MAX_LENGTH = 128

/**
 * Cổng mật khẩu: 3 lần sai trong một cửa sổ 10 phút tính từ lần sai đầu → khoá link cho MỌI người
 * tới hết cửa sổ. Theo token, không theo IP (chốt sản phẩm 2026-10-05; hệ quả cố ý ghi ở spec §6).
 * Walkthrough/proto in 5 lần là sai — 3 là số đúng.
 */
export const ARTIFACT_GATE_MAX_TRIES = 3
export const ARTIFACT_GATE_LOCK_SECONDS = 600

/** Cookie `artifact_viewer` sống một tuần. Con số này KHÔNG hiện cho người quét. */
export const ARTIFACT_VIEWER_SESSION_SECONDS = 7 * 24 * 3600

/** A byte signature to look for: `hex` must appear at `offset` in the uploaded file. */
export type ArtifactMagic = { offset: number; hex: string }

/**
 * ONE row per accepted file extension.
 *
 * Two tables rather than one, because a kind can have several formats: `video` covers .mp4, .webm
 * and .mov, each with its own MIME type and its own signature. Collapsing them into a single
 * `storageMime` per kind is what forces the `; charset=utf-8` class of bug — a value that is right
 * for one member of the group and wrong for the next.
 */
export type ArtifactFormatSpec = {
  kind: ArtifactUploadKind
  /** Lowercase, with the leading dot. */
  extension: string
  /**
   * MIME sent to the bucket on upload. BARE — no parameters.
   *
   * Supabase Storage matches `allowed_mime_types` against the WHOLE string, so uploading
   * `text/html; charset=utf-8` into a bucket that allows `text/html` is rejected outright
   * ("mime type ... is not supported"). That happened, and every upload 500'd while the test suite
   * stayed green, because storage was mocked. Hence `ARTIFACT_STORAGE_MIMES` below and the contract
   * test that reads the migration.
   */
  storageMime: string
  /**
   * What `artifacts.content_type` stores, and what the serve route sends as `Content-Type`.
   * For html the charset parameter matters: an artifact whose HTML omits `<meta charset>` renders
   * Vietnamese as mojibake without it.
   */
  contentType: string
  /**
   * Byte signatures, nhóm thành BIẾN THỂ. Rỗng nghĩa là format không có chữ ký — HTML và Markdown
   * là văn bản thuần (`file-type` trả `undefined` cho chúng, đo ở
   * `docs/artifact-multiformat-findings.md` §4.1).
   *
   * **OR giữa các biến thể, AND trong một biến thể.** Hai nhu cầu khác nhau, và gộp chúng vào một
   * mảng phẳng thì chỉ phục vụ được một:
   *
   * - `.webp` cần AND: `RIFF` ở byte 0 **và** `WEBP` ở byte 8. Thiếu vế sau thì mọi file RIFF
   *   (wav, avi) đổi đuôi đều lọt — đã đo, và đã từng lọt thật.
   * - `.gif` cần OR: `GIF89a` **hoặc** `GIF87a`. Hai chuẩn, cả hai đều là GIF hợp lệ; đòi cả hai
   *   thì không ảnh GIF nào qua được.
   *
   * Chữ ký để PHỦ QUYẾT một file có bytes mâu thuẫn với đuôi của nó, không phải để phân loại:
   * `.pptx` và một `.docx` đổi tên dùng chung chữ ký zip, `.mov` và `.mp4` dùng chung `ftyp`.
   * Đuôi file quyết định format; chữ ký chỉ có quyền từ chối.
   */
  magic: readonly (readonly ArtifactMagic[])[]
}

/**
 * Signatures, and why each one is what it is:
 * - pdf:   `%PDF-`
 * - pptx:  zip local file header `PK\x03\x04`. Proves "is a zip", nothing more — a `.docx` renamed
 *          to `.pptx` passes. Telling OOXML types apart needs `[Content_Types].xml` from inside the
 *          archive, which a prefix check cannot see (measured: 4 and 8 bytes of a real .pptx sniff
 *          as `application/zip`).
 * - ppt:   OLE2 compound file header.
 * - mp4:   `ftyp` at offset 4 — the first box of an ISO-BMFF file.
 * - webm:  EBML header.
 * - mov:   same ISO-BMFF `ftyp`. Deliberately NOT checking for the `qt  ` brand at offset 8: plenty
 *          of valid .mov files carry another brand, and older QuickTime files have no `ftyp` box.
 *
 * The longest signature ends at byte 8, so the first 12 bytes of a file cover every entry here.
 */
export const ARTIFACT_FORMATS: readonly ArtifactFormatSpec[] = [
  {
    kind: 'html',
    extension: '.html',
    storageMime: 'text/html',
    contentType: 'text/html; charset=utf-8',
    magic: [],
  },
  {
    kind: 'html',
    extension: '.htm',
    storageMime: 'text/html',
    contentType: 'text/html; charset=utf-8',
    magic: [],
  },
  {
    kind: 'pdf',
    extension: '.pdf',
    storageMime: 'application/pdf',
    contentType: 'application/pdf',
    magic: [[{ offset: 0, hex: '255044462d' }]],
  },
  {
    kind: 'slides',
    extension: '.pptx',
    storageMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    magic: [[{ offset: 0, hex: '504b0304' }]],
  },
  {
    kind: 'slides',
    extension: '.ppt',
    storageMime: 'application/vnd.ms-powerpoint',
    contentType: 'application/vnd.ms-powerpoint',
    magic: [[{ offset: 0, hex: 'd0cf11e0a1b11ae1' }]],
  },
  {
    kind: 'video',
    extension: '.mp4',
    storageMime: 'video/mp4',
    contentType: 'video/mp4',
    magic: [[{ offset: 4, hex: '66747970' }]],
  },
  {
    kind: 'video',
    extension: '.webm',
    storageMime: 'video/webm',
    contentType: 'video/webm',
    magic: [[{ offset: 0, hex: '1a45dfa3' }]],
  },
  {
    kind: 'video',
    extension: '.mov',
    storageMime: 'video/quicktime',
    contentType: 'video/quicktime',
    magic: [[{ offset: 4, hex: '66747970' }]],
  },
  {
    // Không chữ ký: Markdown là văn bản thuần, y như html. Lớp chặn của nó là bước dựng HTML có
    // sanitize cộng CSP sandbox, không phải nhận dạng byte đầu file.
    kind: 'markdown',
    extension: '.md',
    storageMime: 'text/markdown',
    contentType: 'text/markdown; charset=utf-8',
    magic: [],
  },
  {
    kind: 'markdown',
    extension: '.markdown',
    storageMime: 'text/markdown',
    contentType: 'text/markdown; charset=utf-8',
    magic: [],
  },
  {
    kind: 'document',
    extension: '.docx',
    storageMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [[{ offset: 0, hex: '504b0304' }]],
  },
  {
    kind: 'document',
    extension: '.doc',
    storageMime: 'application/msword',
    contentType: 'application/msword',
    magic: [[{ offset: 0, hex: 'd0cf11e0a1b11ae1' }]],
  },
  {
    kind: 'sheet',
    extension: '.xlsx',
    storageMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    magic: [[{ offset: 0, hex: '504b0304' }]],
  },
  {
    kind: 'sheet',
    extension: '.xls',
    storageMime: 'application/vnd.ms-excel',
    contentType: 'application/vnd.ms-excel',
    magic: [[{ offset: 0, hex: 'd0cf11e0a1b11ae1' }]],
  },
  {
    kind: 'image',
    extension: '.png',
    storageMime: 'image/png',
    contentType: 'image/png',
    magic: [[{ offset: 0, hex: '89504e470d0a1a0a' }]],
  },
  {
    kind: 'image',
    extension: '.jpg',
    storageMime: 'image/jpeg',
    contentType: 'image/jpeg',
    magic: [[{ offset: 0, hex: 'ffd8ff' }]],
  },
  {
    kind: 'image',
    extension: '.jpeg',
    storageMime: 'image/jpeg',
    contentType: 'image/jpeg',
    magic: [[{ offset: 0, hex: 'ffd8ff' }]],
  },
  {
    kind: 'image',
    extension: '.gif',
    storageMime: 'image/gif',
    contentType: 'image/gif',
    // Hai biến thể, OR: `GIF89a` (1989) và `GIF87a` (1987). Chỉ khai bản 89a thì ảnh GIF đời cũ
    // hợp lệ bị từ chối với thông báo "nội dung không khớp .GIF" — agent `arch-artifact` tìm ra.
    magic: [[{ offset: 0, hex: '474946383961' }], [{ offset: 0, hex: '474946383761' }]],
  },
  {
    kind: 'image',
    extension: '.webp',
    // RIFF ở byte 0 và WEBP ở byte 8 — hai mảnh rời nhau, nên khai hai mục. Chỉ kiểm RIFF thì
    // một file .wav đổi đuôi cũng lọt (wav cũng là RIFF).
    storageMime: 'image/webp',
    contentType: 'image/webp',
    magic: [
      [
        { offset: 0, hex: '52494646' },
        { offset: 8, hex: '57454250' },
      ],
    ],
  },
] as const

/**
 * How many leading bytes the upload validator looks at.
 *
 * The furthest-reaching signature in ARTIFACT_FORMATS is webp's `WEBP` tag (4 bytes at offset 8,
 * ending at byte 12); the longest single one is the OLE2 header (8 bytes at offset 0). 16 covers
 * with room to spare. A contract test asserts that, so adding a signature past this window fails
 * loudly instead of silently never matching.
 */
export const ARTIFACT_SNIFF_BYTES = 16

/**
 * How `/a/<token>` hands the bytes over.
 *
 * - `inline-html`    — the user's bytes as `text/html`, under the sandbox CSP.
 * - `inline-binary`  — the user's bytes with their real Content-Type, `Content-Disposition: inline`.
 * - `office-viewer`  — an li2 landing page embedding Office Online's viewer, plus a download button.
 * - `video-landing`  — an li2 landing page with a `<video>` element pointing at the byte route.
 */
export type ArtifactServeMode =
  'inline-html' | 'inline-binary' | 'office-viewer' | 'video-landing' | 'markdown-render'

/**
 * `sandboxed` is only ever true for html. An artifact's HTML is attacker-controlled script, so it
 * runs in an opaque origin. A PDF or a video is inert data, and the landing pages are li2's own
 * markup — sandboxing those would break the Office viewer iframe and the video element for nothing.
 */
export const ARTIFACT_KIND_SPECS: Record<
  ArtifactUploadKind,
  { serveMode: ArtifactServeMode; sandboxed: boolean }
> = {
  html: { serveMode: 'inline-html', sandboxed: true },
  // Markdown ra HTML, mà HTML đó dựng từ chữ của người dùng — nên sandbox y như `html`. Bước
  // sanitize khi dựng đã bỏ script, và sandbox là lớp thứ hai phòng khi sanitize sót.
  markdown: { serveMode: 'markdown-render', sandboxed: true },
  pdf: { serveMode: 'inline-binary', sandboxed: false },
  // Ba loại Office đi chung một viewer của Microsoft. `document` và `sheet` tách khỏi `slides`
  // vì chúng là ba thứ khác nhau với người dùng, và icon/nhãn phải nói đúng cái họ vừa tải lên.
  slides: { serveMode: 'office-viewer', sandboxed: false },
  document: { serveMode: 'office-viewer', sandboxed: false },
  sheet: { serveMode: 'office-viewer', sandboxed: false },
  // Ảnh là dữ liệu trơ: trình duyệt vẽ nó, không chạy gì. Giống PDF, sandbox không mua được gì.
  // SVG CỐ TÌNH không có trong danh sách — nó là XML chạy được script, phục vụ inline trên
  // domain artifact là mở đúng lỗ XSS mà CSP của `html` dựng ra để bịt.
  image: { serveMode: 'inline-binary', sandboxed: false },
  video: { serveMode: 'video-landing', sandboxed: false },
}

/**
 * DERIVED, never hand-copied — the bucket whitelist and this list are the two halves of the bug
 * that made every upload 500 once already. The contract test compares this array against
 * `allowed_mime_types` in the migration.
 *
 * Deduplicated: .html and .htm share one MIME, and Postgres has no reason to hold it twice.
 */
export const ARTIFACT_STORAGE_MIMES: readonly string[] = [
  ...new Set(ARTIFACT_FORMATS.map((format) => format.storageMime)),
]

/** Also derived. The frontend's file picker reads THIS, it does not keep its own list. */
export const ACCEPTED_ARTIFACT_EXTENSIONS: readonly string[] = ARTIFACT_FORMATS.map(
  (format) => format.extension
)

/** Ready for an `<input type="file" accept="...">`. */
export const ARTIFACT_FILE_ACCEPT = ACCEPTED_ARTIFACT_EXTENSIONS.join(',')

/**
 * The file extension decides the format. `File.type` from the browser is NOT consulted: it is empty
 * for many files, and it is whatever the client says it is — a value the caller controls must not
 * pick which MIME we hand to storage or send back as a header.
 */
export function artifactFormatForFileName(fileName: string): ArtifactFormatSpec | null {
  const lower = fileName.toLowerCase()
  return ARTIFACT_FORMATS.find((format) => lower.endsWith(format.extension)) ?? null
}

export function artifactKindForFileName(fileName: string): ArtifactUploadKind | null {
  return artifactFormatForFileName(fileName)?.kind ?? null
}

export const isArtifactStatus = (v: unknown): v is ArtifactStatus =>
  typeof v === 'string' && (ARTIFACT_STATUSES as readonly string[]).includes(v)
export const isArtifactKind = (v: unknown): v is ArtifactKind =>
  typeof v === 'string' && (ARTIFACT_KINDS as readonly string[]).includes(v)
export const isArtifactUploadKind = (v: unknown): v is ArtifactUploadKind =>
  typeof v === 'string' && (ARTIFACT_UPLOAD_KINDS as readonly string[]).includes(v)

/**
 * How long the signed URL handed to Office Online stays valid.
 *
 * Minted fresh on every render of `/a/<token>` and NEVER stored: writing it to a row would turn a
 * URL with an expiry into a permanent one sitting in the database. Fifteen minutes is long enough
 * for Microsoft to fetch and render the file, and short enough that a URL copied out of the page
 * source stops working the same afternoon.
 */
export const ARTIFACT_OFFICE_SIGNED_URL_TTL_SECONDS = 900

/**
 * Quota for the FREE plan, per organization. The numbers are a product decision and may move; the
 * path into the code is not, which is why they live here rather than inline in the service.
 *
 * They are exported for the FRONTEND too, and that is the point: a message that names a different
 * number than the one being enforced is the fastest way to lose a user's trust in the number.
 *
 * Deliberately NOT metered by views or bandwidth. Tiiny meters those because it sells hosting; li2
 * sells analytics, and charging for views means taxing the very thing being sold.
 *
 * Hai trục độc lập, hai thông điệp từ chối riêng: hết SLOT thì xoá một artifact, hết BYTE thì tải
 * file nhỏ hơn — hai hành động ngược nhau, một câu "hết quota" chung sẽ không nói được việc nào.
 *
 * 2026-10-19 (chủ sản phẩm): 3 → 50 live, byte vẫn 30MB. Hệ quả cố ý: 30MB / 10MB mỗi file = 3,
 * nên một org toàn video 10MB chạm trần byte trước trần slot rất xa; 50 slot dành cho nhiều artifact
 * nhỏ (HTML, PDF vài trăm KB). Bất biến cũ "BYTES / MAX_BYTES >= LIVE" bị bỏ vì chính quyết định này.
 */
export const ARTIFACT_QUOTA_FREE_LIVE = 50
export const ARTIFACT_QUOTA_FREE_BYTES = 30 * 1024 * 1024 // 31457280

/**
 * Aliases for the html format, kept so `artifact-serve.service.ts` and the existing contract tests
 * keep compiling. New code should read the format or kind spec instead — these two say nothing
 * about a PDF or a video.
 */
export const ARTIFACT_CONTENT_TYPE = 'text/html; charset=utf-8'
export const ARTIFACT_STORAGE_MIME = 'text/html'

/**
 * `POST …/{artifact_id}/replace`: the DTO plus what the row USED to weigh — the one fact about the
 * old version the caller may still want, and the one the SQL function hands back for free. Not
 * folded into `ArtifactDTO`: every other read of an artifact has no "previous" to speak of.
 */
export type ReplaceArtifactResult = ArtifactDTO & { previous_size_bytes: number }

/**
 * `GET …/artifacts/quota` (spec R10). Both axes with their ceilings, so the UI can print "còn trống
 * X MB" and "2 / 3" from one request, and so the two numbers it compares against are the ones the
 * server is actually enforcing — never a constant the client copied.
 */
export type ArtifactQuotaDTO = {
  used_bytes: number
  quota_bytes: number
  live_count: number
  live_quota: number
}

/**
 * What the API hands the frontend. Deliberately NOT the row: `storage_path` is an internal bucket
 * key and never leaves the server, and the two URLs are composed here so the client never has to
 * guess the base URL or how the byte route is spelled.
 */
export type ArtifactDTO = {
  id: string
  organization_id: string
  user_id: string
  name: string
  /**
   * WIDER than the union ON PURPOSE, and only on this READ path.
   *
   * `database.types.ts` types both columns as bare `string` and cannot do otherwise — a generator
   * cannot read a CHECK constraint — so a row may hold a value outside the vocabulary. `toDTO`
   * detects that, logs it, and passes the value through rather than substituting a valid one: every
   * substitute is a lie with consequences (`'blocked'` puts a re-upload button on a row nobody
   * understands), and the frontend already degrades correctly for a value it does not know.
   *
   * ⚠ The looseness stops here. Every INPUT schema and every write path keeps the plain union: a
   * `(string & {})` reaching a write turns "tolerates drift" into "produces drift", and then the
   * CHECK constraint is the only thing left refusing it — a 500 where a 400 belongs.
   *
   * ⚠ This costs exhaustiveness: `switch (dto.kind)` is no longer checked for completeness by tsc.
   * Narrow FIRST with `isArtifactUploadKind` / `isArtifactStatus` and switch on the narrowed type.
   * Do NOT "tidy this up" with `as ArtifactKind` — that is exactly the cast this replaced.
   */
  kind: ArtifactKind | (string & {})
  status: ArtifactStatus | (string & {})
  serve_token: string
  content_type: string
  size_bytes: number
  created_at: string
  /** Moves when the content is replaced (`replaceContent`); equals `created_at` until then. */
  updated_at: string
  touch_point_id: string | null
  /** Cùng kiểu nới như `kind`/`status`, cùng lý do: cột là `string` trong DB. */
  access_mode: ArtifactAccessMode | (string & {})
  /** Khi nào mật khẩu hiện tại được đặt; null ở mọi chế độ khác. */
  password_set_at: string | null
  /**
   * [P2] Số người (email Google khác nhau) đã mở — `count(*)` trên `artifact_views`. Chỉ `getForOrg`
   * tính; `listForOrg` trả `null` để danh sách không tốn một COUNT cho mỗi thẻ.
   */
  viewer_count: number | null
  /**
   * Số lượt quét KHÔNG-bot của short link đi kèm — `artifact_visit_counts` đếm trong Postgres, một
   * lần gọi cho cả trang (wave 4 S1). Không có `touch_point_id` (nháp) thì là `0`, và `0` cũng là
   * giá trị khi RPC hỏng: con số này là thông tin phụ của trang, không phải điều kiện để trang mở.
   *
   * Không `| null` như `viewer_count`: "chưa ai quét" và "chưa đếm được" đều hiện là 0 trên thanh
   * lượt quét, nên một kiểu nullable chỉ thêm một nhánh ở mọi chỗ render mà không nói thêm gì.
   */
  visits: number
  /**
   * Địa chỉ công khai để chia sẻ/mở tab mới: `<ARTIFACT_LINK_URL>/<org_slug>/<slug>` khi artifact đã
   * live và có host riêng; không thì `/a/<token>` trên app như trước.
   */
  serve_url: string
  /** Luôn là `/a/<token>` trên app — đường cho iframe xem trước (cùng origin, mang cookie app). */
  preview_url: string
  download_url: string
  short_url: string | null
  path_qr_code: string | null
}
