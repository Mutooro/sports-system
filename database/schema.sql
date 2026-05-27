-- Makerere Sports Management System - Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS sports_management_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE sports_management_db;

-- Users table (authentication)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'coach', 'student') NOT NULL DEFAULT 'student',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- Halls of residence
CREATE TABLE halls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(200),
  capacity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Teams
CREATE TABLE teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  hall_id INT NOT NULL,
  sport_type ENUM('football', 'rugby', 'basketball', 'swimming', 'athletics') DEFAULT 'football',
  coach_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_hall (hall_id),
  INDEX idx_coach (coach_id)
) ENGINE=InnoDB;

-- Players
CREATE TABLE players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  student_number VARCHAR(50) NOT NULL UNIQUE,
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  position ENUM('goalkeeper', 'defender', 'midfielder', 'forward', 'winger'),
  sport ENUM('football', 'rugby', 'basketball', 'swimming', 'athletics') DEFAULT 'football',
  team_id INT,
  hall_id INT,
  date_of_birth DATE,
  photo_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_team (team_id),
  INDEX idx_hall (hall_id)
) ENGINE=InnoDB;

-- Fixtures
CREATE TABLE fixtures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  home_team_id INT NOT NULL,
  away_team_id INT NOT NULL,
  venue ENUM('football_pitch', 'rugby_ground', 'swimming_pool', 'basketball_court', 'athletics_track') NOT NULL,
  match_date TIMESTAMP NOT NULL,
  status ENUM('scheduled', 'postponed', 'cancelled', 'completed') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_match_date (match_date),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Matches (results)
CREATE TABLE matches (
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

-- Performances
CREATE TABLE performances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  player_id INT NOT NULL,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  minutes_played INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  tackles INT DEFAULT 0,
  passes_completed INT DEFAULT 0,
  shots_on_target INT DEFAULT 0,
  rating DECIMAL(3,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_match (match_id),
  INDEX idx_player (player_id)
) ENGINE=InnoDB;

-- Ratings (auto-calculated)
CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  overall DECIMAL(3,1) NOT NULL,
  attack DECIMAL(3,1) DEFAULT 5.0,
  defense DECIMAL(3,1) DEFAULT 5.0,
  fitness DECIMAL(3,1) DEFAULT 5.0,
  teamwork DECIMAL(3,1) DEFAULT 5.0,
  discipline DECIMAL(3,1) DEFAULT 5.0,
  calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_overall (overall)
) ENGINE=InnoDB;

-- Fitness records
CREATE TABLE fitness_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  record_date DATE NOT NULL,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  heart_rate INT,
  weight DECIMAL(5,2),
  injury_type VARCHAR(100),
  injury_status ENUM('fit', 'minor', 'moderate', 'severe', 'recovering') DEFAULT 'fit',
  recovery_notes TEXT,
  recorded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_player (player_id),
  INDEX idx_record_date (record_date)
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('fixture', 'team_news', 'selection', 'general') DEFAULT 'general',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_via ENUM('email', 'in_app', 'both') DEFAULT 'in_app',
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB;

-- Audit logs
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Insert default halls (Makerere's 9 halls)
INSERT INTO halls (name, location, capacity) VALUES
('Mitchell Hall', 'Main Campus', 500),
('Nkrumah Hall', 'Main Campus', 450),
('Livingstone Hall', 'Main Campus', 400),
('University Hall', 'Main Campus', 550),
('Mary Stuart Hall', 'Main Campus', 600),
('Africa Hall', 'Main Campus', 350),
('Lumumba Hall', 'Main Campus', 400),
('Complex Hall', 'Main Campus', 300),
('Nsibirwa Hall', 'Main Campus', 250);
