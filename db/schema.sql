-- li2-oss — schema đầy đủ, single-tenant.
--
-- Chạy một lần khi khởi tạo. `docker compose up` tự nạp file này (xem docker-compose.yml:
-- nó được mount vào /docker-entrypoint-initdb.d/).
--
-- Vì sao KHÔNG có cột `organization_id` ở đâu cả: bản này single-tenant theo ADR-001. Một
-- instance = một tổ chức. Thêm cột đó "để sau này dùng" là mời lại đúng lớp lỗi mà bản thương
-- mại đã gặp (route quên lọc tenant). Cần multi-tenant thì fork và thêm, đừng để sẵn một cột
-- không ai lọc theo.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────── người dùng

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  -- scrypt, định dạng "scrypt$<N>$<r>$<p>$<salt_b64>$<hash_b64>" — xem lib/auth/password.ts
  password_hash text NOT NULL,
  display_name  text,
  is_admin      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  -- Lưu HASH của token, không lưu token. Rò bảng này không cho ai mạo danh được.
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx    ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires_at);

-- ─────────────────────────────────────────────────────────────── link

CREATE TYPE link_kind AS ENUM ('redirect', 'artifact');

CREATE TABLE links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Địa chỉ công khai là `/<slug>`. Chữ thường, chữ-số-gạch, 1..64.
  slug        text NOT NULL UNIQUE
                CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  kind        link_kind NOT NULL DEFAULT 'redirect',
  -- Bắt buộc khi kind='redirect'; NULL khi kind='artifact' (nội dung nằm ở bảng artifacts).
  destination text,
  title       text,
  is_active   boolean NOT NULL DEFAULT true,
  -- NULL = công khai. Có giá trị = cần mật khẩu, lưu bằng cùng scheme scrypt như users.
  -- Bản thương mại lưu mật khẩu short link BẢN RÕ ở ba lớp; đây là chỗ không lặp lại việc đó.
  password_hash text,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT redirect_can_khai_destination
    CHECK (kind <> 'redirect' OR destination IS NOT NULL)
);

CREATE INDEX links_created_at_idx ON links(created_at DESC);

-- ─────────────────────────────────────────────────────────────── artifact

CREATE TYPE artifact_status AS ENUM ('draft', 'live', 'removed');

CREATE TABLE artifacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Quan hệ 1-1 với links, giữ nguyên thiết kế của bản gốc: artifact xuất bản BẰNG CÁCH tạo
  -- một link. Không có artifact nào "live" mà không có địa chỉ công khai.
  link_id      uuid UNIQUE REFERENCES links(id) ON DELETE SET NULL,
  status       artifact_status NOT NULL DEFAULT 'draft',
  -- Đường dẫn tương đối trong STORAGE_DIR. Không bao giờ chứa đường dẫn tuyệt đối của máy chủ.
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type    text NOT NULL,
  size_bytes   bigint NOT NULL CHECK (size_bytes >= 0),
  -- sha256 của nội dung, để nhận trùng và để kiểm toàn vẹn.
  content_hash text,
  expires_at   timestamptz,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX artifacts_status_idx  ON artifacts(status);
CREATE INDEX artifacts_expires_idx ON artifacts(expires_at) WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────── lượt truy cập

CREATE TABLE visits (
  id         bigserial PRIMARY KEY,
  link_id    uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  -- HASH của IP + muối theo ngày, không lưu IP. Đủ để đếm khách duy nhất trong ngày,
  -- không đủ để truy lại một người. Xem lib/analytics/visitor.ts.
  visitor_hash text,
  user_agent text,
  referer    text,
  -- Mã quốc gia 2 chữ nếu reverse proxy có gửi header; không có thì NULL.
  -- v1 KHÔNG nhúng dataset GeoIP nào — ba dataset của bản thương mại đều chưa tra được license.
  country    text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')
);

CREATE INDEX visits_link_time_idx ON visits(link_id, visited_at DESC);

-- Bảng đếm tách riêng: đọc số tổng không cần quét `visits`.
CREATE TABLE link_stats (
  link_id      uuid PRIMARY KEY REFERENCES links(id) ON DELETE CASCADE,
  visit_count  bigint NOT NULL DEFAULT 0,
  last_visit_at timestamptz
);

-- ─────────────────────────────────────────────────────────────── trigger

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER links_touch     BEFORE UPDATE ON links     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER artifacts_touch BEFORE UPDATE ON artifacts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Ghi lượt truy cập và cộng dồn trong MỘT lần gọi, để đường redirect chỉ đi một vòng tới DB.
CREATE OR REPLACE FUNCTION record_visit(
  p_link_id uuid,
  p_visitor_hash text,
  p_user_agent text,
  p_referer text,
  p_country text
) RETURNS void AS $$
BEGIN
  INSERT INTO visits (link_id, visitor_hash, user_agent, referer, country)
  VALUES (p_link_id, p_visitor_hash, p_user_agent, p_referer, p_country);

  INSERT INTO link_stats (link_id, visit_count, last_visit_at)
  VALUES (p_link_id, 1, now())
  ON CONFLICT (link_id) DO UPDATE
    SET visit_count = link_stats.visit_count + 1,
        last_visit_at = now();
END;
$$ LANGUAGE plpgsql;
