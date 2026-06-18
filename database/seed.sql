-- Canonical seed data for development.
-- Mirrors server/src/scripts/seedDb.js. Run with `npm run db:seed` if you want
-- the SQL path; otherwise the JS seed script is the canonical entry point.

SET client_min_messages = WARNING;

-- Halls
INSERT INTO halls (name, location, capacity) VALUES
  ('Mitchell Hall',    'Main Campus', 500),
  ('Nkrumah Hall',     'Main Campus', 450),
  ('Livingstone Hall', 'Main Campus', 400),
  ('University Hall',  'Main Campus', 550),
  ('Mary Stuart Hall', 'Main Campus', 600),
  ('Africa Hall',      'Main Campus', 350),
  ('Lumumba Hall',     'Main Campus', 400),
  ('Complex Hall',     'Main Campus', 300),
  ('Nsibirwa Hall',    'Main Campus', 250);

-- Admin (password: admin123 — bcrypt(12) hash generated at runtime by the JS seed).
-- The literal below is the same hash produced by hashPassword('admin123') with the
-- project's bcrypt settings. Regenerate via the JS seed if you change salt rounds.
-- INSERT INTO users ... is left to the JS seed because bcrypt hashes are produced
-- at runtime; this file documents the data shape.

-- Coaches (password: coach123)
-- Students (password: student123)
-- See server/src/scripts/seedDb.js for the canonical implementation.
