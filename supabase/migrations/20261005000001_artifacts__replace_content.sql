-- Thay nội dung artifact mà giữ nguyên QR và short link (wave 3, việc 1).
--
-- VÌ SAO CÓ FILE NÀY
--
-- Chuỗi phục vụ là QR → short_url → /a/<serve_token> → hàng artifacts → storage_path → bytes.
-- `serve_token` thuộc HÀNG, không thuộc file: ghi đè `storage_path`/`kind`/`content_type`/`size_bytes`
-- trên đúng hàng đó là đủ để người quét QR cũ thấy nội dung mới. Nhưng hai hàm SQL hiện có không
-- tái dùng được: `artifact_create_if_within_quota` INSERT hàng mới và tính quota CỘNG DỒN
-- (`v_used + p_size_bytes`) — thay 3 MB bằng 7 MB sẽ bị tính 7 MB thay vì 4 MB;
-- `artifact_publish_if_within_quota` chỉ đếm slot live, không đụng byte.
--
-- Spec: docs/artifact-wave3-replace-file.md R3.

-- ============================================
-- 3a. Cột updated_at — chưa tồn tại
-- ============================================
-- Bảng chỉ có `created_at` (20260928000001). FE cần "cập nhật lúc" sau khi thay file, và tiêu chí
-- nghiệm thu A2 so `updated_at > created_at`. Hàng cũ nhận `now()` lúc migrate — chấp nhận, FE chỉ
-- dùng nó để hiển thị.
--
-- IF NOT EXISTS để file này re-runnable, cùng tinh thần CREATE OR REPLACE ở 20260930000003.

ALTER TABLE "public"."artifacts"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL;

-- ============================================
-- 3b. replace(): đổi hàng sang object mới, hoặc từ chối — trả về hàng TRƯỚC khi đổi
-- ============================================
-- Bốn quyết định trong hàm, và lý do:
--
-- 1. TRẢ HÀNG CŨ, không trả hàng mới. Caller cần đúng hai thứ từ DB: `storage_path` cũ để xoá và
--    `size_bytes` cũ cho `previous_size_bytes`. Mọi giá trị mới caller đã biết. Và đây là chỗ chặn
--    race hai lần thay song song: nếu caller xoá path nó ĐỌC TRƯỚC ĐÓ, hai request R1/R2 cùng đọc
--    P0 → R1 ghi P1, R2 ghi P2, cả hai xoá P0 → P1 mồ côi, hàng trỏ P2. Trả `v_old` đọc DƯỚI LOCK
--    thì R2 nhận P1 và xoá đúng P1.
--
-- 2. `status IN ('live','draft')` kiểm TRONG hàm, không chỉ ở TypeScript: artifact bị gỡ trong lúc
--    byte đang bay phải bị từ chối ở đây — lúc này hàng đã `removed`, object đã xoá, mà UPDATE thành
--    công sẽ dựng bia mộ trỏ vào object sống.
--
-- 3. KHÔNG HÀNG = TỪ CHỐI, cùng khuôn hai hàm cũ. Hàm không nói VÌ SAO từ chối; service đọc lại
--    hàng để phân loại 404/409/403. `RETURNS TABLE(outcome, …)` sẽ rõ hơn nhưng phá khuôn
--    `SETOF artifacts` mà repository và contract test đang dựa vào.
--
-- 4. QUOTA TÍNH DELTA: trừ file đang chiếm chỗ rồi mới cộng file mới. Sum vẫn `status <> 'removed'`,
--    khớp `sumSizeBytesByOrg` — bất biến hai nửa của wave 2.
--
-- Cùng khoá advisory với create/publish: ba hàm chia một tổng byte, phải xếp hàng cùng một chỗ.
-- `RETURN NEXT v_old; RETURN;` — không `RETURN <biểu thức>`: quota-rpc-contract.test.ts bắt đúng lỗi đó.

CREATE OR REPLACE FUNCTION "public"."artifact_replace_if_within_quota"(
  "p_org_id" "uuid",
  "p_artifact_id" "uuid",
  "p_kind" "text",
  "p_storage_path" "text",
  "p_content_type" "text",
  "p_size_bytes" bigint,
  "p_quota_bytes" bigint
) RETURNS SETOF "public"."artifacts"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_used bigint;
  v_old "public"."artifacts";
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  SELECT * INTO v_old
  FROM "public"."artifacts"
  WHERE "id" = p_artifact_id AND "organization_id" = p_org_id
    AND "status" IN ('live', 'draft')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(sum("size_bytes"), 0) INTO v_used
  FROM "public"."artifacts"
  WHERE "organization_id" = p_org_id AND "status" <> 'removed';

  IF v_used - v_old."size_bytes" + p_size_bytes > p_quota_bytes THEN
    RETURN;
  END IF;

  UPDATE "public"."artifacts"
  SET "kind" = p_kind,
      "storage_path" = p_storage_path,
      "content_type" = p_content_type,
      "size_bytes" = p_size_bytes,
      "updated_at" = now()
  WHERE "id" = p_artifact_id;

  RETURN NEXT v_old;
  RETURN;
END;
$$;
