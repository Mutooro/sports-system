-- Makerere Sports Management System - lineups migration.
-- Adds teams.formation, matches.home_lineup, matches.away_lineup (JSONB NULL on
-- Postgres, JSON NULL on MySQL). Idempotent.

USE sports_management_db;

-- Adds the saved-XI / lineup columns to teams and matches.
-- Safe to re-run: each ALTER guards with IF NOT EXISTS via information_schema.

-- teams.formation: stored tactical lineup (array of slot objects).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'teams'
    AND column_name  = 'formation'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE teams ADD COLUMN formation JSON NULL COMMENT "Saved tactical formation: array of slot objects"',
  'SELECT "teams.formation already present"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- matches.home_lineup: player ids in the home starting XI for this match.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'matches'
    AND column_name  = 'home_lineup'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE matches ADD COLUMN home_lineup JSON NULL COMMENT "Array of player ids in the home starting XI for this match"',
  'SELECT "matches.home_lineup already present"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- matches.away_lineup: player ids in the away starting XI for this match.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'matches'
    AND column_name  = 'away_lineup'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE matches ADD COLUMN away_lineup JSON NULL COMMENT "Array of player ids in the away starting XI for this match"',
  'SELECT "matches.away_lineup already present"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;