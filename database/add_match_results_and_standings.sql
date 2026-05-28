USE sports_management_db;

-- Create matches table if it does not already exist
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fixture_id INT NOT NULL,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  played_date TIMESTAMP NOT NULL,
  result ENUM('home_win', 'away_win', 'draw', 'no_result'),
  weather_conditions VARCHAR(100),
  match_report TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  INDEX idx_fixture (fixture_id)
) ENGINE=InnoDB;

-- Create standings view for league table calculations
DROP VIEW IF EXISTS team_standings;
CREATE VIEW team_standings AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  COUNT(m.id) AS played,
  SUM(CASE
    WHEN m.result = 'home_win' AND f.home_team_id = t.id THEN 1
    WHEN m.result = 'away_win' AND f.away_team_id = t.id THEN 1
    ELSE 0
  END) AS wins,
  SUM(CASE WHEN m.result = 'draw' THEN 1 ELSE 0 END) AS draws,
  SUM(CASE
    WHEN m.result = 'home_win' AND f.away_team_id = t.id THEN 1
    WHEN m.result = 'away_win' AND f.home_team_id = t.id THEN 1
    ELSE 0
  END) AS losses,
  SUM(CASE WHEN f.home_team_id = t.id THEN m.home_score WHEN f.away_team_id = t.id THEN m.away_score ELSE 0 END) AS goals_for,
  SUM(CASE WHEN f.home_team_id = t.id THEN m.away_score WHEN f.away_team_id = t.id THEN m.home_score ELSE 0 END) AS goals_against,
  SUM(CASE
    WHEN m.result = 'home_win' AND f.home_team_id = t.id THEN 3
    WHEN m.result = 'away_win' AND f.away_team_id = t.id THEN 3
    WHEN m.result = 'draw' THEN 1
    ELSE 0
  END) AS points
FROM matches m
JOIN fixtures f ON f.id = m.fixture_id
JOIN teams t ON t.id IN (f.home_team_id, f.away_team_id)
WHERE m.result IN ('home_win', 'away_win', 'draw')
GROUP BY t.id, t.name;
