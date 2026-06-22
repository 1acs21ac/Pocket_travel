-- ============================================================
-- Pocket Travel Companion - MySQL Schema
-- Converted from PostgreSQL version
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  nickname VARCHAR(64) DEFAULT '旅行搭子',
  avatar_url VARCHAR(512) DEFAULT '',
  interest_tags_json JSON DEFAULT ('[]'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bean_accounts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  balance INT NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_bean_accounts_balance_range CHECK (balance >= 0 AND balance <= 200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bean_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  delta INT NOT NULL,
  reason VARCHAR(128) NOT NULL,
  claim_id BIGINT NULL,
  metadata_json JSON NULL,
  idempotency_key VARCHAR(128) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mood_profiles (
  user_id BIGINT PRIMARY KEY,
  answers_json JSON NOT NULL,
  mood_tags_json JSON NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS routes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255) NOT NULL,
  detail_json JSON NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_routes_source_type_allowed CHECK (source_type IN ('generate', 'import', 'adopt'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  detail_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_spots_lat_lng_range CHECK (lat >= -90 AND lat <= 90 AND lng >= -180 AND lng <= 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkins (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  spot_id BIGINT NOT NULL,
  distance_meter INT NOT NULL,
  photos_json JSON NOT NULL,
  dry_tags_json JSON NOT NULL,
  content VARCHAR(500) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_checkins_distance_meter_non_negative CHECK (distance_meter >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  spot_id BIGINT NOT NULL,
  rating INT NOT NULL,
  content VARCHAR(500) NOT NULL,
  images_json JSON NULL,
  tags_json JSON NULL,
  mood_tags_json JSON NULL,
  like_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_comments_rating_range CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT chk_comments_like_count_non_negative CHECK (like_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spot_favorites (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  spot_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_spot_favorites_user_spot (user_id, spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS share_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  share_type VARCHAR(32) NOT NULL,
  target_id BIGINT NOT NULL,
  share_code VARCHAR(64) NOT NULL UNIQUE,
  metadata_json JSON NULL,
  checkin_id BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_share_records_share_type_allowed CHECK (share_type IN ('route', 'spot'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bean_reward_claims (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  reward_type VARCHAR(32) NOT NULL,
  target_type VARCHAR(32) NOT NULL DEFAULT 'global',
  target_id BIGINT NOT NULL DEFAULT 0,
  reward_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  notes VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bean_reward_claims (user_id, reward_type, target_type, target_id, reward_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_likes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  comment_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_comment_likes (comment_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id BIGINT NOT NULL,
  actor_user_id BIGINT NULL,
  notification_type VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content VARCHAR(500) NOT NULL DEFAULT '',
  payload_json JSON NOT NULL DEFAULT ('{}'),
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_generation_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  route_id BIGINT NULL,
  source_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  request_json JSON NOT NULL DEFAULT ('{}'),
  result_json JSON NULL,
  error_message VARCHAR(500) DEFAULT '',
  idempotency_key VARCHAR(128) NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_route_gen_source_type CHECK (source_type IN ('generate', 'import', 'adopt')),
  CONSTRAINT chk_route_gen_status CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_stops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id BIGINT NOT NULL,
  spot_id BIGINT NULL,
  stop_order INT NOT NULL,
  title VARCHAR(128) NOT NULL,
  lat DECIMAL(10, 6) NULL,
  lng DECIMAL(10, 6) NULL,
  detail_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_route_stops (route_id, stop_order),
  CONSTRAINT chk_route_stops_order CHECK (stop_order >= 0),
  CONSTRAINT chk_route_stops_lat_lng CHECK (
    (lat IS NULL OR (lat >= -90 AND lat <= 90)) AND
    (lng IS NULL OR (lng >= -180 AND lng <= 180))
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_legs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id BIGINT NOT NULL,
  from_stop_id BIGINT NULL,
  to_stop_id BIGINT NULL,
  leg_order INT NOT NULL,
  distance_meter INT NULL,
  duration_min INT NULL,
  transport_mode VARCHAR(32) DEFAULT '',
  detail_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_route_legs (route_id, leg_order),
  CONSTRAINT chk_route_legs_order CHECK (leg_order >= 0),
  CONSTRAINT chk_route_legs_distance CHECK (distance_meter IS NULL OR distance_meter >= 0),
  CONSTRAINT chk_route_legs_duration CHECK (duration_min IS NULL OR duration_min >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS official_content_imports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  content_type VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL DEFAULT '',
  source_url VARCHAR(512) DEFAULT '',
  payload_json JSON NOT NULL DEFAULT ('{}'),
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_official_content (provider, external_id, content_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spot_provider_refs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  spot_id BIGINT NOT NULL,
  provider VARCHAR(64) NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  source_url VARCHAR(512) DEFAULT '',
  payload_json JSON NOT NULL DEFAULT ('{}'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_spot_provider_ref (provider, external_id),
  UNIQUE KEY uk_spot_provider (spot_id, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Additional Indexes (idempotent — skipped if already exists)
-- MySQL 8.0+ supports CREATE INDEX IF NOT EXISTS natively
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_routes_user_created_at ON routes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bean_logs_user_created_at ON bean_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user_created_at ON checkins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_spot_like_created_at ON comments(spot_id, like_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created_at ON notifications(recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_stop_order ON route_stops(route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_route_legs_route_leg_order ON route_legs(route_id, leg_order);
