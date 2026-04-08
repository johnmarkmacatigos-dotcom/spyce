-- =============================================================
-- SPYCE Database Schema - PostgreSQL 16
-- Migration: 001_initial_schema.sql
-- All monetary amounts stored as BIGINT micro-Pi (1 Pi = 1,000,000)
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =============================================================
-- 1. USERS & IDENTITY
-- =============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid VARCHAR(64) UNIQUE NOT NULL,        -- Pi Network UID
  pi_username VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  spyce_score INTEGER NOT NULL DEFAULT 0,
  pi_balance BIGINT NOT NULL DEFAULT 0,      -- micro-Pi units
  role VARCHAR(20) DEFAULT 'user',           -- user | creator | admin
  is_verified BOOLEAN DEFAULT FALSE,
  kyc_status VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
  country_code CHAR(2),
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_pi_uid ON users(pi_uid);
CREATE INDEX idx_users_pi_username ON users(pi_username);
CREATE INDEX idx_users_spyce_score ON users(spyce_score DESC);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  push_enabled BOOLEAN DEFAULT TRUE,
  earn_notifs BOOLEAN DEFAULT TRUE,
  challenge_notifs BOOLEAN DEFAULT TRUE,
  privacy_mode VARCHAR(20) DEFAULT 'public',  -- public | followers | private
  preferred_lang CHAR(5) DEFAULT 'en-US',
  allow_duets BOOLEAN DEFAULT TRUE,
  allow_stitches BOOLEAN DEFAULT TRUE,
  allow_downloads BOOLEAN DEFAULT TRUE
);

-- =============================================================
-- 2. VIDEOS & CONTENT
-- =============================================================

CREATE TABLE sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200),
  duration_secs SMALLINT,
  audio_key TEXT,                             -- S3 key
  cover_key TEXT,
  use_count BIGINT DEFAULT 0,
  is_original BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(300),
  description TEXT,
  status VARCHAR(20) DEFAULT 'processing',   -- processing | published | failed | deleted
  visibility VARCHAR(20) DEFAULT 'public',   -- public | followers | private
  duration_secs SMALLINT,
  width SMALLINT,
  height SMALLINT,
  raw_key TEXT,                               -- S3 key for original upload
  hls_key TEXT,                              -- S3 key for HLS manifest
  thumbnail_key TEXT,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  share_count BIGINT DEFAULT 0,
  save_count BIGINT DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,          -- computed by AI service
  is_challenge BOOLEAN DEFAULT FALSE,
  challenge_id UUID,
  parent_id UUID REFERENCES videos(id),      -- duet/stitch source
  duet_type VARCHAR(10),                     -- duet | stitch | NULL
  sound_id UUID REFERENCES sounds(id),
  location_lat DECIMAL(9,6),
  location_lon DECIMAL(9,6),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_user ON videos(user_id);
CREATE INDEX idx_videos_engagement ON videos(engagement_score DESC);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_challenge ON videos(challenge_id) WHERE challenge_id IS NOT NULL;

CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag VARCHAR(150) UNIQUE NOT NULL,
  use_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);
CREATE INDEX idx_hashtags_use_count ON hashtags(use_count DESC);

CREATE TABLE video_hashtags (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

CREATE TABLE video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'like',           -- like | love | fire | wow
  pi_awarded BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id, type)
);

CREATE INDEX idx_reactions_video ON video_reactions(video_id);
CREATE INDEX idx_reactions_user ON video_reactions(user_id);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id),
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  pi_awarded BIGINT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_video ON comments(video_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);

CREATE TABLE video_saves (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- =============================================================
-- 3. CHALLENGES
-- =============================================================

CREATE TABLE challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),                      -- health | fitness | learning | community | nutrition | mindfulness
  difficulty VARCHAR(10) DEFAULT 'bronze',   -- bronze | silver | gold | diamond
  verification VARCHAR(20),                  -- sensor | video | peer | ai | self
  pi_reward BIGINT NOT NULL,                 -- micro-Pi
  bonus_streak BIGINT DEFAULT 0,             -- extra Pi for streaks
  duration_secs INTEGER,
  target_value FLOAT,                        -- e.g. 10000 steps
  target_unit VARCHAR(20),                   -- steps | ml | minutes | reps
  max_per_day SMALLINT DEFAULT 1,
  icon_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES challenge_templates(id),
  date DATE NOT NULL,
  featured_order SMALLINT,
  bonus_pool BIGINT DEFAULT 0,
  UNIQUE(template_id, date)
);

CREATE INDEX idx_daily_challenges_date ON daily_challenges(date DESC);

CREATE TABLE challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenge_templates(id),
  daily_id UUID REFERENCES daily_challenges(id),
  status VARCHAR(20) DEFAULT 'pending',      -- pending | verifying | completed | failed | rejected
  proof_type VARCHAR(20),                    -- sensor | video | peer | ai | self
  proof_url TEXT,
  sensor_data JSONB,
  ai_confidence FLOAT,
  pi_awarded BIGINT DEFAULT 0,
  streak_day INTEGER DEFAULT 1,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_completions_user ON challenge_completions(user_id, created_at DESC);
CREATE INDEX idx_completions_challenge ON challenge_completions(challenge_id);
CREATE INDEX idx_completions_status ON challenge_completions(status);

CREATE TABLE user_streaks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenge_templates(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATE,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE squad_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  creator_id UUID REFERENCES users(id),
  template_id UUID REFERENCES challenge_templates(id),
  start_date DATE,
  end_date DATE,
  member_cap SMALLINT DEFAULT 10,
  pi_pool BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE squad_members (
  squad_id UUID REFERENCES squad_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  total_pi_earned BIGINT DEFAULT 0,
  PRIMARY KEY (squad_id, user_id)
);

-- =============================================================
-- 4. PI TRANSACTIONS & EARNINGS
-- =============================================================

CREATE TABLE pi_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  -- earn_reaction | earn_challenge | earn_referral
  -- earn_watch | earn_creator_fund | earn_bounty
  -- spend_boost | spend_tip | spend_purchase | spend_stake
  -- withdraw | deposit
  amount_micro_pi BIGINT NOT NULL,
  direction CHAR(6),                         -- credit | debit
  balance_after BIGINT NOT NULL,
  ref_type VARCHAR(30),                      -- video | challenge | marketplace_order | user
  ref_id UUID,
  pi_tx_id VARCHAR(200),                     -- Pi Network blockchain TX ID
  pi_tx_memo TEXT,
  status VARCHAR(20) DEFAULT 'completed',    -- pending | completed | failed
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pi_tx_user ON pi_transactions(user_id, created_at DESC);
CREATE INDEX idx_pi_tx_type ON pi_transactions(type);
CREATE INDEX idx_pi_tx_status ON pi_transactions(status);

CREATE TABLE pi_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount BIGINT NOT NULL,                    -- micro-Pi
  apy_bps INTEGER DEFAULT 500,              -- basis points, 500 = 5% APY
  locked_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active',       -- active | unlocked | broken
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  referred_id UUID REFERENCES users(id) UNIQUE,
  code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',      -- pending | qualified | paid
  pi_awarded BIGINT DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 5. MARKETPLACE
-- =============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  product_type VARCHAR(20),                  -- physical | digital | service | nft
  price_micro_pi BIGINT NOT NULL,
  stock INTEGER,                             -- NULL = unlimited (digital)
  media_keys TEXT[],                         -- S3 keys for images/demo video
  demo_video_id UUID REFERENCES videos(id),
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  total_sales INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  boosted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_price ON products(price_micro_pi);
CREATE INDEX idx_products_rating ON products(avg_rating DESC);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,              -- 5% of total
  status VARCHAR(20) DEFAULT 'pending',      -- pending | paid | escrow | fulfilled | completed | disputed | refunded
  escrow_tx_id VARCHAR(200),
  delivery_data JSONB,
  affiliate_id UUID REFERENCES users(id),
  affiliate_fee BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON reviews(product_id);

-- =============================================================
-- 6. NOTIFICATIONS
-- =============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,                 -- follow | like | comment | challenge | pi_earned | order | mention
  title VARCHAR(200),
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifs_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifs_unread ON notifications(user_id) WHERE is_read = FALSE;

-- =============================================================
-- 7. LIVE STREAMS
-- =============================================================

CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(300),
  status VARCHAR(20) DEFAULT 'active',       -- active | ended
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_pi_gifted BIGINT DEFAULT 0,
  stream_key TEXT,                           -- RTMP stream key
  playback_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE live_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  amount_micro_pi BIGINT NOT NULL,
  animation VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 8. LEADERBOARDS (materialized for performance)
-- =============================================================

CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  period VARCHAR(20),                        -- daily | weekly | monthly | alltime
  period_start DATE,
  category VARCHAR(30),                      -- earnings | challenges | engagement | referrals
  score BIGINT DEFAULT 0,
  rank INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_period ON leaderboard_snapshots(period, category, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_snapshots(user_id, period);

-- =============================================================
-- 9. BRAND BOUNTIES
-- =============================================================

CREATE TABLE bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(200) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  requirements TEXT,
  reward_micro_pi BIGINT NOT NULL,
  total_budget BIGINT NOT NULL,
  spent_budget BIGINT DEFAULT 0,
  max_completions INTEGER,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bounty_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID REFERENCES bounties(id),
  user_id UUID REFERENCES users(id),
  video_id UUID REFERENCES videos(id),
  status VARCHAR(20) DEFAULT 'pending',      -- pending | approved | rejected | paid
  pi_awarded BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 10. SEED DATA - Challenge Templates
-- =============================================================

INSERT INTO challenge_templates (title, description, category, difficulty, verification, pi_reward, bonus_streak, target_value, target_unit, max_per_day, is_active) VALUES
('10,000 Steps', 'Walk 10,000 steps today', 'fitness', 'silver', 'sensor', 50000, 10000, 10000, 'steps', 1, TRUE),
('Drink 2L Water', 'Stay hydrated — drink 2 liters of water', 'health', 'bronze', 'self', 20000, 5000, 2000, 'ml', 1, TRUE),
('8 Hours Sleep', 'Get a full 8 hours of sleep', 'health', 'bronze', 'sensor', 25000, 5000, 8, 'hours', 1, TRUE),
('10 Push-ups', 'Complete 10 push-ups with proper form', 'fitness', 'bronze', 'ai', 30000, 8000, 10, 'reps', 1, TRUE),
('15-Min Meditation', 'Meditate for 15 minutes', 'mindfulness', 'bronze', 'sensor', 20000, 5000, 900, 'seconds', 1, TRUE),
('Read 30 Minutes', 'Read a book or article for 30 minutes', 'learning', 'bronze', 'self', 25000, 5000, 30, 'minutes', 1, TRUE),
('100 Push-ups', 'Complete 100 push-ups in one session', 'fitness', 'gold', 'ai', 200000, 50000, 100, 'reps', 1, TRUE),
('Random Act of Kindness', 'Do something kind for someone today', 'community', 'silver', 'video', 40000, 10000, NULL, NULL, 1, TRUE),
('No Sugar Today', 'Avoid added sugar for the entire day', 'nutrition', 'silver', 'self', 35000, 10000, NULL, NULL, 1, TRUE),
('5K Run', 'Complete a 5 kilometer run', 'fitness', 'gold', 'sensor', 150000, 30000, 5, 'km', 1, TRUE);
