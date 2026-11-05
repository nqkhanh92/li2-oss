-- Guard trạng thái cho `artifact_publish_if_within_quota` — bịt đường publish vòng qua cổng quét.
--
-- VÌ SAO CÓ FILE NÀY
--
-- `artifact_publish_if_within_quota` (20260930000003_artifacts__atomic_quota.sql:78-81) ghi
-- `SET status = 'live'` với WHERE chỉ gồm `id` và `organization_id`. Nó KHÔNG hề đọc status cũ.
-- Tầng TypeScript chỉ chặn đúng một giá trị — `status === 'live'` → "đã xuất bản"
-- (src/core/services/artifact.service.ts:522-525) — nên năm giá trị còn lại (`scanning`, `blocked`,
-- `expired`, `quarantined`, `removed`) đi qua cả hai tầng và hàng được lật thành `live`.
--
-- Hôm nay chưa có đường nào trong app ghi `quarantined` hay `blocked`
-- (docs/artifact-scan-clamav-spec.md §0: `grep -rn "scanning\|quarantined" src/core/services/` → 0
-- kết quả ghi), nhưng `removed` thì TỒN TẠI THẬT từ 20261001000001: một bia mộ vẫn publish lại được
-- thành `live` trong khi object của nó đã bị xoá khỏi bucket — `/a/<token>` sẽ trả 404/lỗi kho cho
-- một hàng mà dashboard báo là đang phục vụ. Và ngày WP1–WP2 bật ClamAV, `quarantined` là thứ cổng
-- quét sinh ra, nên đây đúng là đường vòng qua chính cái cổng vừa dựng.
--
-- Đây là nửa còn thiếu của một bất biến đã có ở hàm anh em: `artifact_replace_if_within_quota`
-- (20261005000001_artifacts__replace_content.sql:71) đã kiểm `status IN ('live','draft')` TRONG hàm,
-- với đúng lý do ghi ở comment của nó — "artifact bị gỡ trong lúc byte đang bay phải bị từ chối ở
-- đây", vì pre-check TypeScript đứng cách lần ghi vài lời gọi và không thấy được race.
--
-- VÌ SAO TẬP HỢP LỆ LÀ ('draft', 'scanning')
--
-- · `draft`      — đường bình thường, nháp chưa có địa chỉ công khai.
-- · `scanning`   — hàng đang chờ quét. Hôm nay không có đường nào tạo ra nó (spec §1 chọn phương án
--                  B: quét đồng bộ trong `create()`), nhưng `scanning` là giá trị mà một publish
--                  BẤT ĐỒNG BỘ sẽ phải lật sang `live` khi worker xong, và chặn nó ở đây sẽ biến
--                  phương án A — đường lùi đã được viết sẵn ở spec §1 — thành một migration nữa.
-- · `live`       — KHÔNG trong tập này: publish lại một hàng đã live là 409 "đã xuất bản" ở tầng
--                  TypeScript (artifact.service.ts:522-525), và cho nó qua đây sẽ ghi đè
--                  `touch_point_id` bằng touch point vừa mint, bỏ rơi cái cũ — short link và QR đã
--                  in thành mồ côi, không còn gì trong DB trỏ tới chúng.
-- · `blocked`, `quarantined`, `expired` — ba trạng thái HỆ THỐNG đang giữ hàng
--                  (src/core/types/artifact.type.ts:36-38). Mỗi cái có hành động riêng trong UI
--                  (kháng nghị, gia hạn). Publish được chúng chính là cách đi quanh những hành động
--                  đó.
-- · `removed`    — bia mộ, object đã xoá khỏi kho (`deleteForOrg`). Lật nó sang `live` dựng một hàng
--                  live trỏ vào một object không còn tồn tại.
--
-- CÁCH TỪ CHỐI: KHÔNG HÀNG, không exception — cùng khuôn ba hàm artifact hiện có. Hàm không nói VÌ
-- SAO nó từ chối; service đọc lại hàng để phân loại 403 quota / 409 status, đúng như `replaceContent`
-- đã làm (artifact.service.ts:910-918). Ném `RAISE EXCEPTION` ở đây sẽ bắt repository phân biệt lỗi
-- theo `code`/`message` của Postgres — một kênh thứ hai cho cùng một ý nghĩa, trong khi
-- `data?.[0] ?? null` ở `publishIfWithinQuota` (artifact.repository.ts:148) đã đọc đúng.
--
-- `IF NOT FOUND THEN RETURN; END IF;` là BẮT BUỘC, không phải trang trí. Bản cũ `RETURN NEXT v_row;`
-- vô điều kiện: khi UPDATE không khớp hàng nào, `v_row` là record toàn NULL và hàm trả về MỘT hàng
-- toàn NULL thay vì tập rỗng — `data?.[0] ?? null` thấy một object, service tin là publish thành công.
-- Bản cũ không bao giờ sập bẫy đó vì WHERE của nó gần như luôn khớp; thêm điều kiện status thì nhánh
-- "không khớp" trở thành nhánh chính của việc từ chối.
--
-- Chữ ký, `RETURNS SETOF`, advisory lock, thứ tự đếm-rồi-ghi: giữ nguyên từng chữ. `database.types.ts`
-- không phải sửa. `CREATE OR REPLACE` nên file re-runnable, cùng tinh thần 20260930000003 và
-- 20261001000001.
--
-- Spec: docs/artifact-scan-clamav-spec.md §0.1 và WP3.

CREATE OR REPLACE FUNCTION "public"."artifact_publish_if_within_quota"(
  "p_org_id" "uuid",
  "p_artifact_id" "uuid",
  "p_touch_point_id" "uuid",
  "p_limit" integer
) RETURNS SETOF "public"."artifacts"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_live integer;
  v_row "public"."artifacts";
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  SELECT count(*) INTO v_live
  FROM "public"."artifacts"
  WHERE "organization_id" = p_org_id AND "status" = 'live';

  IF v_live >= p_limit THEN
    RETURN;
  END IF;

  UPDATE "public"."artifacts"
  SET "status" = 'live', "touch_point_id" = p_touch_point_id
  WHERE "id" = p_artifact_id AND "organization_id" = p_org_id
    AND "status" IN ('draft', 'scanning')
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN NEXT v_row;
  RETURN;
END;
$$;

-- ============================================
-- ROLLBACK
-- ============================================
-- Bản TRƯỚC của hàm này nằm nguyên văn trong `20260930000003_artifacts__atomic_quota.sql` (khối
-- "publish(): claim a live slot, or refuse"). Để lùi, chạy lại CHỈ khối `CREATE OR REPLACE FUNCTION
-- "public"."artifact_publish_if_within_quota"` của file đó — nó là `CREATE OR REPLACE` nên ghi đè
-- định nghĩa ở đây, và không có đối tượng nào khác phải dọn (không cột mới, không constraint, không
-- index).
--
-- ⚠️ Lùi là KHÔI PHỤC LẠI LỖ HỔNG: một hàng `quarantined`/`blocked`/`expired`/`removed` publish được
-- thành `live`. Chỉ làm khi cần chứng minh hành vi cũ, và trên DB tạm.
--
-- KHÔNG dán bản cũ vào đây dưới dạng comment: `src/__tests__/unit/artifacts/quota-rpc-contract.test.ts`
-- quét migration bằng regex trên văn bản thuần, không parse SQL, nên một `-- CREATE OR REPLACE
-- FUNCTION …` bị nó đọc như một định nghĩa thật.
