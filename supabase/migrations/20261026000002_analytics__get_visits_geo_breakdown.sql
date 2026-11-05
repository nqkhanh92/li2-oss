-- Phân rã lượt truy cập theo vị trí, cho endpoint GET /analytics/geo (Phase 2 card "Theo vị trí").
--
-- VÌ SAO CẦN MỘT RPC RIÊNG
--
-- `get_visits_analytics_v4` là payload CHUNG cho cả dashboard: nó trả `countries[].cities[]` theo
-- TÊN, không có `region_iso`, không có `region`. Card vị trí cần cả ba tín hiệu — mã tỉnh đã lưu
-- (`region_iso`), mã GeoIP thô (`region`) và tên (`city`) — vì `region_iso` chỉ là BỘ ĐỆM: hàng
-- mới vẫn vào với NULL (li2-worker viết bằng Go, không biết bảng `aliases` nằm ở TypeScript).
-- Nên không sửa v4; thêm hàm này.
--
-- VÌ SAO KHÔNG TÍNH TỈNH TRONG SQL
--
-- Bảng tra 63→34 mã cộng `aliases` nằm ở `src/shared/constants/vietnam-provinces.ts`. Chép xuống
-- SQL là dựng bản thứ hai của cùng một sự thật — lý do đã ghi trong
-- `20261026000001_analytics__visit_region_iso.sql`. Hàm này chỉ GỘP, việc tra tỉnh để TypeScript
-- làm. Số hàng trả về là số tổ hợp vị trí khác nhau (trên LiHi 2026-10-26: 4 hàng cho cả bảng),
-- nên gộp ở SQL rồi tra ở TS không tốn gì.
--
-- VÌ SAO KHÔNG COALESCE VỀ 'unknown'
--
-- v4 làm vậy và nó phá mất một phân biệt thật: `country = 'ZZ'` (GeoIP không nhận ra quốc gia) và
-- `region_iso IS NULL` (biết quốc gia, chưa biết vùng) là hai nghĩa khác nhau, và card phải tách
-- "ngoài nước đang xem" khỏi "không khớp vùng". Trả NULL nguyên trạng, TS tự quyết.
--
-- Cách lọc (org, tp, tag, collection, thời gian, bot, interaction_type) chép đúng `filtered_visits`
-- của v4 để hai card không bao giờ lệch mẫu số.
--
-- CHẠY LẠI ĐƯỢC: `CREATE OR REPLACE`. Áp tay bằng psql trên LiHi, như v4.
-- Hoàn tác: DROP FUNCTION public.get_visits_geo_breakdown(uuid, uuid[], uuid[], uuid[], boolean,
--           timestamp without time zone, timestamp without time zone, boolean, uuid, text[], text);

CREATE OR REPLACE FUNCTION public.get_visits_geo_breakdown(
    _organization_id uuid,
    _tp_ids uuid[] DEFAULT NULL,
    _tag_ids uuid[] DEFAULT NULL,
    _collection_ids uuid[] DEFAULT NULL,
    _include_null_collection boolean DEFAULT false,
    _start_time timestamp without time zone DEFAULT NULL,
    _end_time timestamp without time zone DEFAULT NULL,
    _exclude_bot boolean DEFAULT false,
    _user_id uuid DEFAULT NULL,
    _interaction_types text[] DEFAULT NULL,
    _country text DEFAULT NULL
)
RETURNS TABLE (
    country text,
    region text,
    city text,
    region_iso text,
    count bigint
)
LANGUAGE plpgsql
AS $function$
DECLARE
    tp_ids_from_tags uuid[];
    filtered_tp_ids uuid[];
    has_collection_filter boolean := false;
BEGIN
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
            _tp_ids := _tp_ids || tp_ids_from_tags;
        ELSE
            _tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL THEN
        has_collection_filter := true;

        SELECT array_agg(DISTINCT tp.id) INTO filtered_tp_ids
        FROM touch_points tp
        WHERE (
            tp.collection_id = ANY(_collection_ids)
            OR (_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = _user_id)
        )
        AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp.id = ANY(_tp_ids));

        _tp_ids := COALESCE(filtered_tp_ids, ARRAY[]::uuid[]);
    END IF;

    RETURN QUERY
    SELECT
        v.country,
        v.region,
        v.city,
        v.region_iso,
        COUNT(*) AS count
    FROM visits v
    WHERE v.organization_id = _organization_id
      AND (
          CASE
              WHEN has_collection_filter THEN v.tp_id = ANY(_tp_ids)
              ELSE (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR v.tp_id = ANY(_tp_ids))
          END
      )
      AND (_start_time IS NULL OR v.created_at >= _start_time)
      AND (_end_time IS NULL OR v.created_at <= _end_time)
      AND (NOT _exclude_bot OR v.is_bot = FALSE)
      AND (_interaction_types IS NULL OR array_length(_interaction_types, 1) IS NULL OR v.type = ANY(_interaction_types))
      -- Lọc quốc gia ở SQL để cấp vùng không phải kéo cả thế giới về. So không phân biệt chữ hoa
      -- vì cột `country` do GeoIP ghi, chưa có ràng buộc nào bắt nó hoa.
      AND (_country IS NULL OR upper(v.country) = upper(_country))
    GROUP BY v.country, v.region, v.city, v.region_iso;
END;
$function$;
