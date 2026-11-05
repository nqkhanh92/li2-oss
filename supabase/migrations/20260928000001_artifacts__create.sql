-- Artifacts: user-uploaded single-file HTML served from a private bucket at /a/<serve_token>.
-- Publishing an artifact mints a REAL touch_point (content_type = 'ARTIFACT') whose content_value is
-- that serve URL, so artifacts ride the existing short-link / QR / analytics pipeline.

-- ============================================
-- STORAGE: private artifact-content bucket
-- ============================================
-- Private on purpose: the body is attacker-controlled HTML and must never be reachable by a direct
-- storage URL. It is only ever read back server-side and re-served under a locked-down CSP.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifact-content',
  'artifact-content',
  false,
  5242880,
  ARRAY['text/html']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TABLE: artifacts
-- ============================================
-- touch_point_id lives HERE rather than as touch_points.artifact_id: createTouchPoint takes a Zod
-- payload with no artifact field, so a column on touch_points would force a second write. Here,
-- publish sets status and the link in the single update it already has to make.

CREATE TABLE IF NOT EXISTS "public"."artifacts" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "organization_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "kind" "text" NOT NULL,
  "status" "text" DEFAULT 'draft'::"text" NOT NULL,
  "serve_token" "text" NOT NULL,
  "storage_path" "text" NOT NULL,
  "content_type" "text" NOT NULL,
  "size_bytes" bigint NOT NULL,
  "touch_point_id" "uuid",
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  -- The vocabulary is wider than the prototype uses on purpose: the frontend maps status
  -- exhaustively, and widening a CHECK later is a migration nobody remembers to write.
  -- Today only 'html' is produced, and only 'draft' -> 'live' ever happens.
  CONSTRAINT "artifacts_kind_check" CHECK ("kind" IN ('html', 'markdown', 'pdf', 'site')),
  CONSTRAINT "artifacts_status_check" CHECK (
    "status" IN ('draft', 'scanning', 'live', 'blocked', 'expired', 'quarantined')
  )
);

ALTER TABLE "public"."artifacts" OWNER TO "postgres";

ALTER TABLE ONLY "public"."artifacts"
  ADD CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."artifacts"
  ADD CONSTRAINT "artifacts_serve_token_key" UNIQUE ("serve_token");

-- One artifact per touch point: a second publish must not fan an artifact across several links.
ALTER TABLE ONLY "public"."artifacts"
  ADD CONSTRAINT "artifacts_touch_point_id_key" UNIQUE ("touch_point_id");

ALTER TABLE ONLY "public"."artifacts"
  ADD CONSTRAINT "artifacts_organization_id_fkey" FOREIGN KEY ("organization_id")
  REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- SET NULL, not CASCADE: deleting the link must not destroy the uploaded content.
ALTER TABLE ONLY "public"."artifacts"
  ADD CONSTRAINT "artifacts_touch_point_id_fkey" FOREIGN KEY ("touch_point_id")
  REFERENCES "public"."touch_points"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_artifacts_organization_id_created_at"
  ON "public"."artifacts" USING "btree" ("organization_id", "created_at" DESC);
