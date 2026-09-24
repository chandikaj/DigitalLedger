ALTER TABLE "news_articles"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp;

ALTER TABLE "podcast_episodes"
  ADD COLUMN IF NOT EXISTS "episode_notes" text,
  ADD COLUMN IF NOT EXISTS "transcript" text,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp;