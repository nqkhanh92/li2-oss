-- Preserve deep-link attribution history when a custom domain is deleted.
--
-- WHY: deep_link_events.domain_id was `REFERENCES domains(id) ON DELETE CASCADE`
-- (see 20260413_deep_link_events_and_plan_flag.sql). Deleting a custom domain
-- therefore silently and irreversibly erased every attribution event
-- (app_open / deferred_match / deferred_miss) that any link on that domain ever
-- produced — a side effect of an infra/config action, surfaced only as a broken
-- Deep Link Analytics page once the link reverted to the system-default domain.
--
-- No comparable attribution platform destroys event data as a side effect of a
-- domain edit: Branch governs deletion by a time-based retention policy +
-- explicit GDPR erasure; Adjust/AppsFlyer tie retention to the app, not the link
-- domain; Bitly treats the underlying click data as durable and the domain as
-- infrastructure. We adopt the same durable model — attribution events outlive
-- the domain, and destruction happens only via retention policy or an explicit
-- erasure action (a separate, future phase).
--
-- WHAT: drop NOT NULL on domain_id and switch the FK to ON DELETE SET NULL,
-- mirroring touch_point_id which is ALREADY ON DELETE SET NULL on this same
-- table. After a domain is deleted, the event row keeps its touch_point_id (the
-- link survives — li2-be reassigns it to the system-default domain), so per-link
-- history stays queryable by touch_point_id; only domain_id becomes NULL.
--
-- SCOPE NOTE: this prevents FUTURE loss only. Rows already cascade-deleted by a
-- domain deletion before this migration ran are unrecoverable.
--
-- The FK uses the Postgres default constraint name (the table was created with an
-- inline column-level reference): deep_link_events_domain_id_fkey.
--
-- Manual-apply: Kei applies on dev, then Claude runs `yarn gen:types`
-- (deep_link_events.domain_id flips to nullable in the generated types).

ALTER TABLE public.deep_link_events
  ALTER COLUMN domain_id DROP NOT NULL;

ALTER TABLE public.deep_link_events
  DROP CONSTRAINT IF EXISTS deep_link_events_domain_id_fkey;

ALTER TABLE public.deep_link_events
  ADD CONSTRAINT deep_link_events_domain_id_fkey
  FOREIGN KEY (domain_id) REFERENCES public.domains(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.deep_link_events.domain_id IS
  'Domain that served the deep-link click. ON DELETE SET NULL: nulled (not cascaded) when the domain is deleted so attribution history survives. Historical events stay tied to the link via touch_point_id.';
