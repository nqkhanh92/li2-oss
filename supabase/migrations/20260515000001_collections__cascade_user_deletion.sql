-- Migration: Add ON DELETE CASCADE to collections and collection_members for user_id
-- Description: Ensures collections and membership records are removed when a profile is deleted.
-- Module: collections

-- 1. Update collections table user_id foreign key
ALTER TABLE "public"."collections" 
DROP CONSTRAINT IF EXISTS "collections_user_id_fkey",
ADD CONSTRAINT "collections_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "public"."profiles"("id") 
ON DELETE CASCADE;

-- 2. Update collection_members table user_id foreign key
-- (Note: Provided schema already had it, but this ensures consistency across environments)
ALTER TABLE "public"."collection_members" 
DROP CONSTRAINT IF EXISTS "collection_members_user_id_fkey",
ADD CONSTRAINT "collection_members_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "public"."profiles"("id") 
ON DELETE CASCADE;
