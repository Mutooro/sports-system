-- Seed data for development
-- Run after schema.sql

USE sports_management_db;

-- Insert admin user (password: admin123 - bcrypt hashed)
INSERT INTO users (email, password, role, first_name, last_name, is_active) VALUES
('admin@makerere.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'admin', 'System', 'Administrator', TRUE);

-- Insert coach users (password: coach123)
INSERT INTO users (email, password, role, first_name, last_name, is_active) VALUES
('coach.mitchell@makerere.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'coach', 'John', 'Mukasa', TRUE),
('coach.nkrumah@makerere.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'coach', 'David', 'Okello', TRUE),
('coach.livingstone@makerere.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'coach', 'Peter', 'Kato', TRUE);

-- Insert teams
INSERT INTO teams (name, hall_id, sport_type, coach_id) VALUES
('Mitchell FC', 1, 'football', 2),
('Nkrumah United', 2, 'football', 3),
('Livingstone Stars', 3, 'football', 4);

-- Insert student users (password: student123)
INSERT INTO users (email, password, role, first_name, last_name, is_active) VALUES
('student1@stud.mak.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'student', 'James', 'Akena', TRUE),
('student2@stud.mak.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'student', 'Robert', 'Ochaya', TRUE),
('student3@stud.mak.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'student', 'Emmanuel', 'Opio', TRUE),
('student4@stud.mak.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'student', 'Daniel', 'Kigozi', TRUE),
('student5@stud.mak.ac.ug', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', 'student', 'Michael', 'Ssempala', TRUE);

-- Insert player profiles
INSERT INTO players (user_id, student_number, height, weight, position, sport, team_id, hall_id) VALUES
(5, '21/U/1234', 175.50, 70.00, 'forward', 'football', 1, 1),
(6, '21/U/1235', 180.00, 75.00, 'defender', 'football', 1, 1),
(7, '21/U/1236', 172.00, 68.00, 'midfielder', 'football', 2, 2),
(8, '21/U/1237', 185.00, 80.00, 'goalkeeper', 'football', 2, 2),
(9, '21/U/1238', 178.00, 72.00, 'winger', 'football', 3, 3);
