-- Ai đã mở artifact ở chế độ Đăng nhập Google (wave 3, việc 2, pha 2).
--
-- VÌ SAO CÓ BẢNG NÀY, thay vì chỉ ghi `customer_profiles`
--
-- `customer_profiles` một mình không trả lời được "{n} người đã mở": một khách có thể đã là profile
-- của org từ trước (`first_touch_point_id` không phải của artifact này), và không cột nào trong
-- `visits` nối visit với profile — hàm analytics v4 nối qua `sessions.li2_cid` + `conversion_events`,
-- mà trang `/a/` không chạy SDK li2 nên không có `sessions`. Bảng nối là cách rẻ nhất, không đụng
-- pipeline analytics. Spec: docs/artifact-wave3-access-control.md R1 [P2], §1.3.
--
-- Một hàng cho mỗi (artifact, người); mở lại lần hai → `view_count + 1`, vẫn một người.
-- Pha 1 có thể áp file này sớm — bảng rỗng vô hại; code chỉ ghi khi env Google được đặt.

CREATE TABLE IF NOT EXISTS "public"."artifact_views" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "artifact_id" uuid NOT NULL REFERENCES "public"."artifacts"("id") ON DELETE CASCADE,
  "customer_profile_id" uuid NOT NULL REFERENCES "public"."customer_profiles"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  "first_viewed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_viewed_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "view_count" integer NOT NULL DEFAULT 1,
  CONSTRAINT "artifact_views_unique" UNIQUE ("artifact_id", "customer_profile_id")
);

CREATE INDEX IF NOT EXISTS "idx_artifact_views_artifact" ON "public"."artifact_views" ("artifact_id");
