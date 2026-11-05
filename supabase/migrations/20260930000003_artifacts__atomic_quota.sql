-- Artifact quota, made atomic.
--
-- WHY THIS FILE EXISTS
--
-- Both quota axes were read-check-write in TypeScript: `countLiveByOrg` then `update` in publish(),
-- `sumSizeBytesByOrg` then `create` in create(). Two requests that interleave between the read and
-- the write both see the pre-write state, both pass, and both write — so an org can end up with four
-- live artifacts, or more bytes than its quota.
--
-- The window is not theoretical and not narrow. In publish() the two steps are separated by
-- `createTouchPoint`, which is a round trip to li2-be to mint a short link: two publishes that
-- overlap by that call's duration race. The UI disables its button while a publish is pending, so
-- reaching it takes two tabs, two devices, or a direct API call — but nothing on the server refuses.
--
-- WHY A LOCK, AND NOT A CONDITIONAL UPDATE
--
-- The obvious fix — one statement, `UPDATE ... WHERE (SELECT count(*) ...) < 3` — does NOT work.
-- Postgres runs READ COMMITTED by default, and two concurrent transactions each evaluate that
-- subquery against their own snapshot; neither sees the other's uncommitted row. Both counts read
-- 2, both pass, both write. This is write skew, and it survives being written as a single statement.
--
-- What removes it is serialising the read and the write for one organization. `pg_advisory_xact_lock`
-- does exactly that and costs no table and no column: PostgREST runs each RPC in its own transaction,
-- so the lock is taken and released inside the call, and a second concurrent call blocks until the
-- first commits and then reads the committed count.
--
-- `hashtextextended(org_id::text, 0)` maps the uuid to the bigint key the lock wants. Two different
-- orgs can collide onto one key and serialise against each other; that is contention, not
-- incorrectness, and with one artifact row per upload it is not a number anyone will notice.
--
-- WHY THE LIMITS ARE PARAMETERS
--
-- `p_limit` / `p_quota_bytes` come from `ARTIFACT_QUOTA_FREE_LIVE` / `ARTIFACT_QUOTA_FREE_BYTES` in
-- src/core/types/artifact.type.ts. Hardcoding them here would create the second source of truth this
-- feature has already been bitten by (the `; charset=utf-8` incident in log.md): two numbers that
-- agree until one is changed. TypeScript stays the one place they are written down.
--
-- NO ROW IS THE REFUSAL
--
-- Both functions are `RETURNS SETOF`, so PostgREST answers with a JSON array: one element on
-- success, zero on refusal. `SETOF` rather than a scalar composite on purpose — the generated types
-- in database.types.ts describe several composite-returning functions as a bare object while the
-- call sites index them as arrays (`get_organization_details` is read as `org[0]`), and that
-- discrepancy is not one to add a third instance of. An empty array is unambiguous at runtime and
-- `data?.[0] ?? null` in the repository reads the same either way.
--
-- Idempotent: `CREATE OR REPLACE`, so this is re-runnable against a database that already has them.

-- ============================================
-- publish(): claim a live slot, or refuse
-- ============================================
-- Sets status and touch_point_id together, because publish() has both by the time it calls this —
-- the touch point is minted first, and a refusal here is answered by deleting it again (see
-- `publish()` in artifact.service.ts for why that order was chosen over the reverse).

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
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
  RETURN;
END;
$$;

-- ============================================
-- create(): insert the row, or refuse
-- ============================================
-- The INSERT is the point of commitment: an uploaded object that no row points at is invisible
-- storage, which is why the service checks the byte quota before `storage.put` as well. That
-- pre-check is the cheap path and stays; this is the one that cannot be raced.
--
-- The sum is over EVERY status, matching `sumSizeBytesByOrg`: a draft occupies the bucket exactly as
-- much as a live one, and the quota is about storage rather than visibility.

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
  WHERE "organization_id" = p_org_id;

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
