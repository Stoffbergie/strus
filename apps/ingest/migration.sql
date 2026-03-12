-- Migration: Add request_body column to strus_telemetry_event
-- Run this against your Postgres database before deploying the ingest service.
-- The column is nullable so existing rows are unaffected.

ALTER TABLE strus_telemetry_event
ADD COLUMN IF NOT EXISTS request_body jsonb;

-- Make metadata nullable (it was NOT NULL, but the ingest service
-- populates it from the response body which may not always be present).
ALTER TABLE strus_telemetry_event
ALTER COLUMN metadata DROP NOT NULL;
