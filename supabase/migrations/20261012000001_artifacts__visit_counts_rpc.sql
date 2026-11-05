-- Số lượt quét của artifact (wave 4, việc S1) — đếm TRONG Postgres, không kéo hàng về Node.
--
-- VÌ SAO LÀ MỘT RPC, không phải một câu select
--
-- `enrichWithVisitCounts` của touch point kéo nguyên hàng `visits` về Node rồi length() từng nhóm
-- (`core/repositories/touch-point.repository.ts`), và chính `artifact.repository.ts` gọi đó là "the
-- visits mistake". PostgREST trên deployment này tắt aggregate function, nên `count(*) group by`
-- không viết được từ client — một hàm SQL là cách duy nhất để con số được tính ở nơi dữ liệu nằm.
--
-- MỘT lần gọi cho CẢ trang danh sách: `p_tp_ids` là mảng id của trang, trả về chỉ những tp CÓ lượt
-- quét. Touch point không có hàng nào thì vắng mặt trong kết quả, và caller đọc Map thiếu key là 0 —
-- rẻ hơn là ép hàm trả một hàng 0 cho mỗi id.
--
-- `is_bot = false`: con số trên thẻ là "người thật đã quét", cùng phép lọc mà analytics v4 dùng.
-- Bot vẫn ở trong bảng (xoá chúng là mất dữ liệu kiểm tra), chỉ không được đếm.
--
-- `security definer` vì `visits` là bảng RLS, và `search_path` bị ghim: một hàm definer không ghim
-- search_path là một hàm có thể bị dẫn tới bảng khác tên trùng.

CREATE OR REPLACE FUNCTION "public"."artifact_visit_counts"("p_tp_ids" "uuid"[])
RETURNS TABLE ("tp_id" "uuid", "visits" bigint)
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" = "public"
AS $$
  SELECT "v"."tp_id", count(*) AS "visits"
  FROM "public"."visits" AS "v"
  WHERE "v"."tp_id" = ANY (p_tp_ids)
    AND "v"."is_bot" = false
  GROUP BY "v"."tp_id"
$$;

COMMENT ON FUNCTION "public"."artifact_visit_counts"("uuid"[]) IS
  'Lượt quét không-bot theo touch point, một lần gọi cho cả trang artifact (wave 4 S1).';
