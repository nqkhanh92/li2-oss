/**
 * [P2] Chế độ Google chỉ TỒN TẠI khi cả hai env có mặt (PM chốt §9: gated bằng env, deploy pha 1
 * không chờ ops tạo OAuth client). API (`setAccess` → 400), cổng (`evaluateGate` → 503), route
 * `/a/<token>/google` và `/a/google/callback` (→ 404) cùng đọc hàm này — một công tắc, không bốn.
 *
 * File thuần, không `server-only`, để `artifact.service` lẫn `artifact-gate.service` import được
 * mà không kéo nhau vào import graph.
 */
export const hasArtifactGoogleClient = () =>
  Boolean(process.env.ARTIFACT_GOOGLE_CLIENT_ID && process.env.ARTIFACT_GOOGLE_CLIENT_SECRET)
