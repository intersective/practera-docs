ALTER TABLE roadmap.initiatives ADD COLUMN IF NOT EXISTS customer_visible integer DEFAULT 0 NOT NULL;
ALTER TABLE roadmap.initiatives ADD COLUMN IF NOT EXISTS customer_summary text;
