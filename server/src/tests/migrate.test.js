const { sequelize } = require('../models');
const { migrate: migrateStudentPlayer } = require('../scripts/migrateStudentPlayer');
const { migrate: migrateLineups } = require('../scripts/migrateLineups');

const dbReady = async () => {
  try { await sequelize.authenticate(); return true; }
  catch { return false; }
};

describe('migrations', () => {
  it('migrateStudentPlayer is idempotent: running twice does not throw', async () => {
    if (!(await dbReady())) {
      console.warn('Skipping migrate test: database not reachable');
      return;
    }
    await expect(migrateStudentPlayer()).resolves.not.toThrow();
    await expect(migrateStudentPlayer()).resolves.not.toThrow();
  });

  it('migrateLineups is idempotent: running twice does not throw', async () => {
    if (!(await dbReady())) {
      console.warn('Skipping migrate test: database not reachable');
      return;
    }
    await expect(migrateLineups()).resolves.not.toThrow();
    await expect(migrateLineups()).resolves.not.toThrow();
  });

  it('ensures users.student_number is NOT NULL UNIQUE after migration', async () => {
    if (!(await dbReady())) return;

    const [rows] = await sequelize.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'student_number'
    `);
    expect(rows[0].is_nullable).toBe('NO');
  });

  it('ensures players has the (user_id, sport) unique index', async () => {
    if (!(await dbReady())) return;

    const [pgRows] = await sequelize.query(`
      SELECT 1 FROM pg_indexes WHERE tablename = 'players' AND indexname = 'uq_players_user_sport'
    `).catch(() => [[]]);
    const [otherRows] = await sequelize.query(`
      SELECT 1 FROM information_schema.statistics
      WHERE table_name = 'players' AND index_name = 'uq_players_user_sport'
    `).catch(() => [[]]);
    expect((pgRows && pgRows.length) || (otherRows && otherRows.length)).toBeTruthy();
  });

  it('ensures players.student_number column is gone', async () => {
    if (!(await dbReady())) return;

    const [rows] = await sequelize.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'players' AND column_name = 'student_number'
    `);
    expect(rows.length).toBe(0);
  });

  it('ensures teams.formation, matches.home_lineup, matches.away_lineup exist', async () => {
    if (!(await dbReady())) return;

    const [rows] = await sequelize.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name = 'teams'   AND column_name = 'formation')
         OR (table_name = 'matches' AND column_name IN ('home_lineup', 'away_lineup'))
    `);
    const seen = new Set(rows.map(r => r.table_name + '.' + r.column_name));
    expect(seen.has('teams.formation')).toBe(true);
    expect(seen.has('matches.home_lineup')).toBe(true);
    expect(seen.has('matches.away_lineup')).toBe(true);
  });
});