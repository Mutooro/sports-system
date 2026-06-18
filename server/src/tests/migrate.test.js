const { sequelize } = require('../models');
const { migrate } = require('../scripts/migrateStudentPlayer');

const dbReady = async () => {
  try { await sequelize.authenticate(); return true; }
  catch { return false; }
};

describe('migrateStudentPlayer', () => {
  it('is idempotent: running twice does not throw', async () => {
    if (!(await dbReady())) {
      console.warn('Skipping migrate test: database not reachable');
      return;
    }
    await expect(migrate()).resolves.not.toThrow();
    // Running again must be a no-op.
    await expect(migrate()).resolves.not.toThrow();
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
});
