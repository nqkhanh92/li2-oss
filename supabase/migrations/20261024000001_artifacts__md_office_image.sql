-- ============================================
-- ARTIFACTS: thêm markdown, Word/Excel và hình ảnh
-- ============================================
-- Chủ sản phẩm 2026-10-24. Trước đó upload được 4 kind (html, pdf, slides, video) / 8 đuôi file;
-- nay là 8 kind / 20 đuôi.
--
-- Hai nửa của cùng một thay đổi, và chúng PHẢI đi cùng nhau:
--   1. `storage.buckets.allowed_mime_types` — Supabase Storage từ chối upload nếu MIME không có
--      trong mảng này. Thiếu một dòng ở đây thì mọi upload của định dạng đó trả 500, đúng lỗi đã
--      xảy ra một lần khi thêm multiformat.
--   2. `artifacts_kind_check` — CHECK từ chối INSERT nếu kind lạ.
-- Một nửa mà không có nửa kia thì upload gãy ở đúng chỗ khó đoán nhất.
--
-- `allowed_mime_types` được Supabase Storage so với TOÀN BỘ chuỗi Content-Type, nên mọi mục ở đây
-- là MIME TRẦN — không `; charset=utf-8`. Giữ danh sách này y hệt `ARTIFACT_STORAGE_MIMES` trong
-- `src/core/types/artifact.type.ts`; một contract test so hai bên và gãy nếu chúng lệch nhau.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'text/html',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]
WHERE id = 'artifact-content';

-- ============================================
-- TABLE: nới artifacts_kind_check
-- ============================================
-- `document`, `sheet` và `image` gia nhập. `markdown` vốn đã nằm trong CHECK từ migration đầu
-- (chỉ chưa có đường upload), nên không cần thêm — nhưng vẫn liệt kê đủ vì CHECK phải viết lại
-- trọn vẹn.
--
-- `site` ở lại dù vẫn chưa có đường upload: thu hẹp một CHECK là migration không ai nhớ viết,
-- và frontend đã map cả danh sách.
--
-- DROP rồi ADD chứ không ALTER: Postgres không có cú pháp sửa CHECK tại chỗ. `IF EXISTS` ở lệnh
-- drop để chạy lại được trên database đã áp.

ALTER TABLE "public"."artifacts"
  DROP CONSTRAINT IF EXISTS "artifacts_kind_check";

ALTER TABLE "public"."artifacts"
  ADD CONSTRAINT "artifacts_kind_check"
  CHECK ("kind" IN (
    'html', 'markdown', 'pdf', 'site', 'slides', 'document', 'sheet', 'image', 'video'
  ));

-- `artifacts_status_check` cố tình KHÔNG đụng tới: bộ từ vựng trạng thái không đổi.
-- `file_size_limit` cũng không đổi — vẫn 10 MB như multiformat đã đặt.
