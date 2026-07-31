-- Rights and provenance metadata for lawful catalog ingestion.
-- This migration is written for the deployed PostgreSQL/Supabase database.

DO $$
BEGIN
  CREATE TYPE "rightsStatus" AS ENUM ('public_domain', 'open_access', 'metadata_only', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "rightsStatus" "rightsStatus" NOT NULL DEFAULT 'unknown';
--> statement-breakpoint

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "licenseName" varchar(255);
--> statement-breakpoint

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "licenseUrl" text;
--> statement-breakpoint

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "directDownloadAllowed" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "provenanceCheckedAt" timestamp;
--> statement-breakpoint

UPDATE "books"
SET
  "rightsStatus" = CASE
    WHEN "source" = 'gutenberg' THEN 'public_domain'::"rightsStatus"
    WHEN "source" IN ('doab', 'open_textbook', 'openstax', 'doaj', 'ajol', 'pubmed') THEN 'open_access'::"rightsStatus"
    WHEN "source" = 'open_library' THEN 'metadata_only'::"rightsStatus"
    ELSE 'unknown'::"rightsStatus"
  END,
  "licenseName" = CASE
    WHEN "source" = 'gutenberg' THEN 'Project Gutenberg public-domain collection'
    WHEN "source" = 'doab' THEN 'Open-access book; see publisher record for license terms'
    WHEN "source" = 'open_textbook' THEN 'Open textbook; see source record for license terms'
    WHEN "source" = 'openstax' THEN 'OpenStax openly licensed textbook'
    WHEN "source" = 'doaj' THEN 'Open-access article indexed by DOAJ'
    WHEN "source" = 'open_library' THEN 'Discovery metadata; access remains subject to the source record'
    ELSE NULL
  END,
  "licenseUrl" = CASE
    WHEN "source" = 'gutenberg' THEN 'https://www.gutenberg.org/policy/license.html'
    WHEN "source" = 'doab' THEN 'https://www.doabooks.org/'
    WHEN "source" = 'open_textbook' THEN 'https://open.umn.edu/opentextbooks/'
    WHEN "source" = 'openstax' THEN 'https://openstax.org/details/books'
    WHEN "source" = 'doaj' THEN 'https://doaj.org/apply/transparency'
    WHEN "source" = 'open_library' THEN 'https://openlibrary.org/developers/api'
    ELSE NULL
  END,
  "directDownloadAllowed" = CASE
    WHEN "source" IN ('gutenberg', 'doab', 'open_textbook', 'openstax', 'doaj') THEN true
    ELSE false
  END,
  "provenanceCheckedAt" = COALESCE("provenanceCheckedAt", now())
WHERE "rightsStatus" = 'unknown'::"rightsStatus";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "books_rights_status_idx" ON "books" ("rightsStatus");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "books_direct_download_allowed_idx" ON "books" ("directDownloadAllowed");
