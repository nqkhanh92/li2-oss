-- Trạng thái `removed` — "bia mộ" của một artifact đã gỡ.
--
-- VÌ SAO CÓ FILE NÀY
--
-- Trước đợt này, bấm Xoá xoá cả ba: object trong bucket, hàng `artifacts`, và touch point. Đo trên
-- LiHi 2026-10-01: short link sau đó KHÔNG trả 404 như comment trong artifact.service.ts tin, mà
-- trả 200 kèm trang lỗi tiếng Anh của li2-be — giống hệt trang của một slug gõ sai. Người quét QR
-- không bao giờ tới được /a/<token>.
--
-- Mô hình mới: short link và nội dung là hai đối tượng có vòng đời riêng. Gỡ nội dung xoá file
-- trong kho và đặt hàng thành 'removed'; touch point sống tiếp, nên 302 vẫn chạy, lượt quét vẫn
-- đếm, và /a/<token> trả 410 kèm trang có thương hiệu.
--
-- 'removed' là giá trị MỚI, không tái dùng 'expired' (hết hạn tự động) hay 'quarantined' (hệ thống
-- gỡ vì an toàn): cả hai đều nói sai về ai đã quyết.

-- ============================================
-- CHECK: nới vocabulary của status
-- ============================================
-- DROP rồi ADD, không ALTER: Postgres không có "ALTER CONSTRAINT ... CHECK". Hai câu nằm trong cùng
-- một migration nên không có khoảnh khắc nào bảng chạy mà thiếu CHECK.
--
-- IF EXISTS để file này re-runnable, cùng tinh thần CREATE OR REPLACE ở 20260930000003.

ALTER TABLE "public"."artifacts" DROP CONSTRAINT IF EXISTS "artifacts_status_check";

ALTER TABLE "public"."artifacts" ADD CONSTRAINT "artifacts_status_check" CHECK (
  "status" IN ('draft', 'scanning', 'live', 'blocked', 'expired', 'quarantined', 'removed')
);

-- ============================================
-- create(): bia mộ KHÔNG còn ăn quota dung lượng
-- ============================================
-- ĐÂY LÀ NỬA DỄ BỎ SÓT NHẤT CỦA YÊU CẦU "bia mộ không tính quota".
--
-- `sumSizeBytesByOrg` trong TypeScript là pre-check; hàm này là phép kiểm KHÔNG RACE được, và
-- 20260930000003 cố ý viết "sum trên MỌI status, khớp với sumSizeBytesByOrg". Nếu chỉ sửa
-- TypeScript, hai nửa bất đồng: pre-check nói còn chỗ, hàm này từ chối — và nó từ chối SAU khi
-- file đã nằm trong bucket. Người dùng vừa gỡ nội dung để lấy chỗ lại vẫn bị báo hết chỗ, đúng cái
-- làm nút Xoá mất tác dụng.
--
-- `size_bytes` của hàng bia mộ GIỮ NGUYÊN giá trị cũ (để biết nó từng nặng bao nhiêu); việc loại
-- trừ làm ở truy vấn, không bằng cách ghi đè size_bytes = 0.
--
-- Chỉ một dòng đổi so với 20260930000003: thêm `AND "status" <> 'removed'` vào WHERE của SELECT
-- sum. Phần còn lại copy nguyên — advisory lock, SETOF, RETURN NEXT — vì sao thì đọc comment đầu
-- file 20260930000003.
--
-- `artifact_publish_if_within_quota` KHÔNG sửa: nó đếm `status = 'live'`, bia mộ không bao giờ là
-- `live`.

CREATE OR REPLACE FUNCTION "public"."artifact_create_if_within_quota"(
  "p_id" "uuid",
  "p_org_id" "uuid",
  "p_user_id" "uuid",
  "p_name" "text",
  "p_kind" "text",
  "p_serve_token" "text",
  "p_storage_path" "text",
  "p_content_type" "text",
  "p_size_bytes" bigint,
  "p_quota_bytes" bigint
) RETURNS SETOF "public"."artifacts"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_used bigint;
  v_row "public"."artifacts";
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  SELECT COALESCE(sum("size_bytes"), 0) INTO v_used
  FROM "public"."artifacts"
  WHERE "organization_id" = p_org_id AND "status" <> 'removed';

  IF v_used + p_size_bytes > p_quota_bytes THEN
    RETURN;
  END IF;

  INSERT INTO "public"."artifacts" (
    "id", "organization_id", "user_id", "name", "kind", "status",
    "serve_token", "storage_path", "content_type", "size_bytes"
  ) VALUES (
    p_id, p_org_id, p_user_id, p_name, p_kind, 'draft',
    p_serve_token, p_storage_path, p_content_type, p_size_bytes
  )
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
  RETURN;
END;
$$;
