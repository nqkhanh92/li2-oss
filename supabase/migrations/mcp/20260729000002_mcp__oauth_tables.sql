-- Li2 MCP Server — Phase 3a
-- The three tables behind the MCP OAuth 2.1 authorization server.
--
-- Kei applies this MANUALLY, then runs `yarn gen:types`. Never `supabase db push`.
-- Until it is applied, every /api/mcp/oauth/* endpoint fails at its first query — the intended
-- fail-closed state, since nothing else in the app reads these tables.
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- FOUR DESIGN DECISIONS THAT LOOK LIKE OMISSIONS. THEY ARE NOT.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- 1. NO `org_id` COLUMN ANYWHERE (plan §4.1). The OAuth grant binds to the USER, not to one
--    organization. Every MCP data tool takes `org_id` as a per-call argument and the membership +
--    `mcp_access` entitlement are re-checked live at PASETO mint time (Phase 4). Caching an org in
--    the grant would mean a user who leaves an org keeps agent access to it until the token
--    expires. Do NOT "normalize" an org column back in.
--
-- 2. NO FOREIGN KEY FROM codes/tokens TO `mcp_oauth_clients`. Under the 2025-11-25 spec, Client ID
--    Metadata Documents (CIMD) are the SHOULD and Dynamic Client Registration is only a MAY: a CIMD
--    client's `client_id` IS an https URL that the AS fetches on demand, and it writes NO row here.
--    An FK would make every CIMD grant fail on insert. `client_id` is therefore a free-standing
--    text value in all three tables, and the token endpoint never looks the client up at all (it
--    only checks that the presented `client_id` matches the one bound to the code/token).
--
-- 3. HASHES ONLY, NEVER RAW SECRETS. `code_hash` / `access_token_hash` / `refresh_token_hash` hold
--    hex SHA-256 of the value handed to the client. A database dump therefore grants nothing.
--    SHA-256 (not bcrypt/argon2) is correct HERE and only here: these are 256-bit random values, so
--    there is no dictionary to attack, and a fast hash is what makes O(1) lookup-by-hash possible.
--    The same choice would be wrong for a password.
--
-- 4. NO ROW LEVEL SECURITY. Repo-wide convention — this app has zero `ENABLE ROW LEVEL SECURITY`
--    across all migrations; access is via the service role and every check lives in the service
--    layer (`src/core/services/mcp-oauth.service.ts`). Adding RLS to these three tables alone would
--    be inconsistent and would not add a check that the service layer does not already make.

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- 1. mcp_oauth_clients — RFC 7591 Dynamic Client Registration
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- ⚠️ THIS TABLE IS WRITTEN BY AN UNAUTHENTICATED ENDPOINT. `POST /api/mcp/oauth/register` accepts
--    anyone. Two controls bound the damage and both are load-bearing:
--      (a) an IP rate limit in the route (Redis), and
--      (b) the `last_granted_at IS NULL` sweep at the bottom of this file — a client that registers
--          and never completes a consent is garbage after 24h.
--    Only three fields are ever stored, whatever the client sends: RFC 7591 registration bodies
--    differ in the tail between real clients (Claude sends `application_type`, MCP Inspector sends
--    `client_uri` — both captured live in the Phase 0.2 spike), so everything else is accepted and
--    dropped rather than modelled.

CREATE TABLE "public"."mcp_oauth_clients" (
    -- Server-generated opaque id, `li2mcp_` + 32 hex. NOT a URL: a URL-shaped client_id means CIMD,
    -- and CIMD clients never reach this table.
    "client_id"                  text        PRIMARY KEY,

    -- Display string shown on the consent screen (3b). Client-supplied, so it is untrusted UI text:
    -- length-capped on write here, and MUST be escaped, never rendered as markup, by the page.
    "client_name"                text        NOT NULL,

    -- Exact-match allow-list. Validation at /authorize is byte equality against one of these
    -- entries — no prefix match, no wildcard, no normalization (see the service).
    "redirect_uris"              text[]      NOT NULL,

    -- Always 'none' today: MCP clients are public clients and PKCE is the proof, not a secret.
    -- Stored anyway so that adding a confidential client later is a data change, not a schema one.
    "token_endpoint_auth_method" text        NOT NULL DEFAULT 'none',

    "created_at"                 timestamptz NOT NULL DEFAULT now(),

    -- NULL until this client first gets an authorization code issued. That is precisely the signal
    -- the sweep uses to tell "a real user connected an agent" from "someone POSTed /register".
    "last_granted_at"            timestamptz,

    CONSTRAINT mcp_oauth_clients_redirect_uris_not_empty CHECK (cardinality("redirect_uris") > 0),
    CONSTRAINT mcp_oauth_clients_name_len CHECK (char_length("client_name") BETWEEN 1 AND 128)
);

-- Drives the never-used-client sweep. Partial: registered-and-used rows are never swept, so they
-- do not belong in the index.
CREATE INDEX idx_mcp_oauth_clients_unused
    ON "public"."mcp_oauth_clients" ("created_at")
    WHERE "last_granted_at" IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- 2. mcp_oauth_codes — authorization codes (RFC 6749 §4.1 + PKCE RFC 7636)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Lifetime ~60 seconds and single-use. Single-use is enforced ATOMICALLY by the service as one
-- `DELETE ... WHERE code_hash = $1 RETURNING *` statement (PostgREST `.delete().eq().select()`).
-- Read-then-delete would leave a window in which two concurrent token requests both see the row and
-- both mint a token pair; DELETE...RETURNING takes the row lock, so exactly one caller can ever
-- receive a row back. Do not "refactor" that into a select followed by a delete.

CREATE TABLE "public"."mcp_oauth_codes" (
    "code_hash"      text        PRIMARY KEY,
    "client_id"      text        NOT NULL,
    "user_id"        uuid        NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,

    -- What the user actually consented to — NOT what the client asked for. `write` only appears
    -- here if the consent screen's checkbox was ticked (plan §4).
    "scopes"         text[]      NOT NULL,

    -- The PKCE S256 challenge, verbatim from /authorize.
    -- ⚠️ THERE IS DELIBERATELY NO `code_challenge_method` COLUMN. S256 is the only method this
    --    server accepts; `plain` is rejected at /authorize, as is a missing challenge. A method
    --    column could only ever hold 'S256' — and a nullable or defaulted one is exactly the shape
    --    through which `plain` support quietly returns.
    "code_challenge" text        NOT NULL,

    -- Bound at issue time and re-checked at /token (RFC 6749 §4.1.3 requires the match).
    "redirect_uri"   text        NOT NULL,

    "expires_at"     timestamptz NOT NULL,
    "created_at"     timestamptz NOT NULL DEFAULT now()
);

-- Expiry sweep. Codes live ~60s, so this index stays tiny.
CREATE INDEX idx_mcp_oauth_codes_expires_at ON "public"."mcp_oauth_codes" ("expires_at");

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- 3. mcp_oauth_tokens — opaque access + rotating refresh tokens
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- One row = one access/refresh PAIR. Access 1h, refresh 30d WITH ROTATION: refreshing revokes this
-- row (killing both of its tokens) and inserts a new row carrying the same `grant_id`.
--
-- Access tokens are opaque and li2-app's own — NOT PASETO. PASETO keeps its single existing job,
-- the 15-minute li2-ai back hop with `aud=li2-ai`; Phase 4 exchanges an opaque access token for a
-- freshly minted PASETO on every tool call. Opaque is what makes instant revocation possible, which
-- is the whole reason li2-app is the authorization server rather than Casdoor (plan §5).

CREATE TABLE "public"."mcp_oauth_tokens" (
    "id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stable across the whole rotation chain. Two jobs: revoking a grant kills every generation at
    -- once, and replaying an ALREADY-ROTATED refresh token (the classic sign the token leaked)
    -- lets the service revoke the entire family instead of just refusing one call — RFC 9700
    -- §4.14.2 refresh-token-replay detection.
    "grant_id"           uuid        NOT NULL,

    "access_token_hash"  text        NOT NULL UNIQUE,
    "refresh_token_hash" text        UNIQUE,

    "client_id"          text        NOT NULL,
    "user_id"            uuid        NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "scopes"             text[]      NOT NULL,

    -- Access token expiry (1h).
    "expires_at"         timestamptz NOT NULL,
    -- Refresh token expiry (30d). NULL means this pair has no refresh token.
    "refresh_expires_at" timestamptz,

    -- Set on rotation, on RFC 7009 /revoke, and on replay detection. Kills BOTH tokens of the row:
    -- the access token dies with its refresh token on purpose, so a client that refreshes early
    -- cannot keep using the superseded access token. Clients already handle 401-then-refresh.
    "revoked_at"         timestamptz,

    "created_at"         timestamptz NOT NULL DEFAULT now()
);

-- The hot path: Phase 4 validates a bearer on every single MCP request. UNIQUE above already
-- indexes `access_token_hash`; this one narrows it to rows that can still be valid.
CREATE INDEX idx_mcp_oauth_tokens_live
    ON "public"."mcp_oauth_tokens" ("access_token_hash")
    WHERE "revoked_at" IS NULL;

-- Family revocation (replay detection + /revoke).
CREATE INDEX idx_mcp_oauth_tokens_grant ON "public"."mcp_oauth_tokens" ("grant_id");

-- Expiry sweep, and "which agents has this user connected" for the v2 management UI (plan §8).
CREATE INDEX idx_mcp_oauth_tokens_user ON "public"."mcp_oauth_tokens" ("user_id", "created_at" DESC);
CREATE INDEX idx_mcp_oauth_tokens_expires_at ON "public"."mcp_oauth_tokens" ("expires_at");

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — expect 3 rows, and `rls_enabled = false` on all three (see decision 4 above)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('mcp_oauth_clients', 'mcp_oauth_codes', 'mcp_oauth_tokens')
ORDER BY c.relname;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- HOUSEKEEPING — not scheduled by this migration. Run manually, or attach to pg_cron later.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- The service lazy-deletes what it happens to touch (an expired code is deleted by the very claim
-- that rejects it); these three statements collect what nobody ever comes back for. v1 accepts
-- manual sweeps — plan Phase 3a: "lazy-delete on access + a periodic sweep is acceptable for v1".
--
-- -- (a) Expired authorization codes. Should be near-empty; a large count means codes are being
-- --     issued and abandoned, i.e. users are bouncing off the consent screen.
-- DELETE FROM "public"."mcp_oauth_codes" WHERE "expires_at" < now() - interval '1 hour';
--
-- -- (b) Dead token rows: refresh expired (or absent) AND access expired, plus long-revoked rows.
-- --     Keep revoked rows a while — they are the evidence trail for replay detection.
-- DELETE FROM "public"."mcp_oauth_tokens"
-- WHERE ("revoked_at" IS NOT NULL AND "revoked_at" < now() - interval '30 days')
--    OR (COALESCE("refresh_expires_at", "expires_at") < now() - interval '30 days');
--
-- -- (c) ⚠️ THE ANTI-SPAM SWEEP. Clients that registered and never completed a consent.
-- DELETE FROM "public"."mcp_oauth_clients"
-- WHERE "last_granted_at" IS NULL AND "created_at" < now() - interval '24 hours';

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (drops every issued grant with it — every connected agent stops working)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS "public"."mcp_oauth_tokens";
-- DROP TABLE IF EXISTS "public"."mcp_oauth_codes";
-- DROP TABLE IF EXISTS "public"."mcp_oauth_clients";
