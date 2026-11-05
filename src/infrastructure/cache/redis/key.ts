export const REDIS_KEYS = {
  BILLING: {
    PENDING_ORDER: (userId: string) => `billing:pending_order:${userId}`,
  },
  DOMAIN: {
    VERIFY: 'domain:verify',
  },
  USER: {
    PERMISSIONS_ORG: (userId: string, orgId: string) => `user:${userId}:permissions:org:${orgId}`,
    IS_ORG_OWNER: (userId: string, orgId: string) => `user:${userId}:is_owner:org:${orgId}`,
  },
  APP_SETTINGS: 'app_settings:singleton',
  DEMO: {
    SESSION: (sessionId: string) => `demo:session:${sessionId}`,
  },
  SDK_DEBUG: {
    ACTIVE: (orgId: string) => `sdk:debug:active:${orgId}`,
  },
  AGENT_CHAT: {
    /**
     * Một đề xuất XOÁ đang chờ người dùng bấm Xoá/Thôi.
     *
     * Cất ở Redis chứ không ở DB: nó sống đúng khoảng giữa hai lượt, và nếu người dùng bỏ đi thì
     * điều đúng là nó biến mất chứ không nằm lại thành rác. TTL cũng chính là chính sách — một đề
     * xuất quá hạn phải tắt chứ không được chờ mãi, vì thứ nó định xoá có thể đã đổi.
     *
     * Khoá theo `proposal_id` do server sinh (UUID), KHÔNG theo thứ gì người gửi điều khiển được.
     * Giá trị lưu kèm `org_id` + `user_id` để lượt duyệt kiểm lại — ai bắt được một proposal_id
     * cũng không dùng nó ở org khác được.
     */
    PROPOSAL: (proposalId: string) => `agent:chat:proposal:${proposalId}`,
  },
  BEHAVIOR_DEBUG: {
    RESULT: (orgId: string) => `behavior:debug:result:${orgId}`,
  },
  MCP_OAUTH: {
    /** Sliding window for the UNAUTHENTICATED RFC 7591 registration endpoint. IP-keyed on purpose:
     *  there is no user to key on, which is exactly what makes /register spammable. */
    REGISTER_IP: (ip: string) => `mcp:oauth:register:ip:${ip}`,
    /** Cached Client ID Metadata Document, keyed by a hash of the client_id URL rather than the URL
     *  itself — client_id is attacker-supplied and would otherwise let anyone shape Redis keys. */
    CIMD: (urlHash: string) => `mcp:oauth:cimd:${urlHash}`,
    /** Sliding window on the OUTBOUND fetch an unauthenticated /authorize can trigger. IP-keyed for
     *  the same reason as REGISTER_IP: there is no user yet. Counts cache MISSES only, so a real
     *  client — whose client_id is stable and therefore cached — barely touches it. */
    CIMD_FETCH_IP: (ip: string) => `mcp:oauth:cimd:fetch:ip:${ip}`,
  },
  FAVICON: {
    /**
     * Favicon của một trang đích, theo **origin** chứ không theo URL đầy đủ: mọi link tới cùng một
     * site dùng chung một biểu tượng, nên khoá theo URL sẽ gọi ra ngoài một lần cho mỗi link.
     *
     * Lưu cả **kết quả hỏng** (xem `FAVICON_MISS`): intend.md chốt "nhớ kết quả hỏng để không gọi
     * lại mỗi lần tải trang". Không có negative cache thì mỗi lần mở danh sách là một lần gọi ra
     * ngoài cho từng site không có favicon — đúng thứ cache này tồn tại để chặn.
     *
     * `origin` đã qua `checkFetchableUrl` nên là host hợp lệ; không cần hash.
     */
    ORIGIN: (origin: string) => `favicon:origin:${origin}`,
  },
  ARTIFACT: {
    /**
     * Số lần nhập sai mật khẩu ở `/a/<token>`, cửa sổ cố định 10 phút tính từ lần sai đầu (spec R6).
     * Theo TOKEN, không theo IP — chốt sản phẩm 2026-10-05; hệ quả cố ý: ai biết link có thể khoá link
     * 10 phút cho tất cả. Token đã qua `SERVE_TOKEN_PATTERN` (16 hex) nên không cần hash.
     */
    GATE_FAIL: (token: string) => `artifact:gate:fail:${token}`,
    /**
     * `publish_artifact.idempotency_key` → `artifact_id`, 24 giờ (spec WP3, đề xuất §3).
     *
     * Theo ORG, không theo user: `publish_artifact` tạo tài nguyên của org, và một agent retry sau
     * timeout có thể quay lại bằng token khác của cùng org. Khoá theo user sẽ cho hai phiên của cùng
     * một org dùng lại cùng key mà vẫn tạo hai artifact — đúng cái thứ tham số này tồn tại để chặn.
     *
     * `keyHash` là sha256 hex của key agent gửi, KHÔNG phải key thô. Key do caller đặt và `:` nằm
     * trong bộ ký tự cho phép, nên để thô thì caller tự chọn được số đoạn của tên khoá Redis. Hash
     * cũng chặn trần độ dài tên khoá ở 64 ký tự.
     */
    IDEMPOTENCY: (orgId: string, keyHash: string) => `artifact:idem:${orgId}:${keyHash}`,
  },
  SHORT_LINK: {
    /**
     * `create_short_link.idempotency_key` → `touch_points.id`, 24 giờ (spec SL-3).
     *
     * ⚠️ MỘT NAMESPACE RIÊNG, KHÔNG DÙNG LẠI `ARTIFACT.IDEMPOTENCY`. Hai tool khác nhau trả về hai
     * loại tài nguyên khác nhau, nên cùng một key của cùng một org phải trả lời được "key này đã
     * publish artifact nào" độc lập với "key này đã tạo short link nào". Dùng chung tiền tố thì một
     * caller đặt key theo ngày (`publish:2026-10-20`) sẽ thấy `create_short_link` replay lại
     * artifact_id của chính nó — một id thuộc bảng khác.
     *
     * Cũng vì vậy mà SL-0 KHÔNG đổi `artifact:idem:*` thành một tên chung: khoá cũ đang sống trong
     * Redis thật với TTL 24 giờ, đổi tên khoá là tự nguyện đánh mất mọi claim đang treo — đúng cái
     * tham số này tồn tại để chặn.
     *
     * `keyHash` là sha256 hex của key agent gửi, KHÔNG phải key thô (lý do: xem ARTIFACT ở trên).
     */
    IDEMPOTENCY: (orgId: string, keyHash: string) => `short_link:idem:${orgId}:${keyHash}`,
  },
  MCP: {
    /**
     * Fixed-window tool-call counter (plan Phase 5).
     *
     * ⛔ KEYED BY (user, client) AND NEVER BY ORG. `org_id` is a TOOL ARGUMENT the client chooses per
     * call (plan §4.1), so an org-keyed window would hand every caller a reset button: rotate the id,
     * get a fresh budget. The OAuth grant binds to the user, so the user is what the budget belongs
     * to; the client is in the key so one misbehaving connector cannot starve the user's others.
     *
     * `clientIdHash`, not the raw id: a CIMD `client_id` is an attacker-supplied https URL, and the
     * CIMD cache key above hashes it for exactly this reason — an unbounded, caller-shaped string has
     * no business being a Redis key name.
     *
     * `bucket` (= floor(epochSeconds / windowSeconds)) is IN THE KEY so the window is self-healing: if
     * the EXPIRE ever fails to land, the next window is simply a different key. A single key relying
     * on TTL alone would, in that case, lock the user out permanently.
     */
    CALL_WINDOW: (window: string, userId: string, clientIdHash: string, bucket: number) =>
      `mcp:rate:${window}:${userId}:${clientIdHash}:${bucket}`,
  },
} as const
