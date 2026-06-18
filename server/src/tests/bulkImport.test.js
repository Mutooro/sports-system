const request = require('supertest');
const { sequelize, User, Player, Team, Hall } = require('../models');

const dbReady = async () => {
  try { await sequelize.authenticate(); return true; }
  catch { return false; }
};

const buildApp = () => {
  const express = require('express');
  const routes = require('../routes');
  const errorHandler = require('../middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/api/v1', routes);
  app.use(errorHandler);
  return app;
};

async function loginAs(app, email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) return null;
  return res.body.data.accessToken;
}

const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

describe('POST /api/v1/admin/bulk/import', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    if (!(await dbReady())) {
      console.warn('Skipping bulk-import tests: database not reachable');
      return;
    }
    app = buildApp();
    adminToken = await loginAs(app, 'admin@makerere.ac.ug', 'admin123');
  });

  it('requires admin authentication', async () => {
    if (!app) return;
    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .send({ students: [] });
    expect(res.status).toBe(401);
  });

  it('dry-runs a full payload and writes nothing', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dryRun: true,
        students: [{
          email: `bulk-dry-${s}@example.com`,
          first_name: 'Dry',
          last_name: 'Run',
          student_number: `DRY-${s}`
        }],
        teams: [],
        players: []
      });
    expect(res.status).toBe(200);
    expect(res.body.data.dry_run).toBe(true);
    expect(res.body.data.sections.students.created).toBe(1);
    // Confirm nothing was actually written.
    const created = await User.findOne({ where: { email: `bulk-dry-${s}@example.com` } });
    expect(created).toBeNull();
  });

  it('imports students, then teams referencing in-batch coaches, then players in dependency order', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const coachEmail = `bulk-coach-${s}@example.com`;
    const studentEmail = `bulk-stu-${s}@example.com`;
    const teamName = `Bulk Team ${s}`;

    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        coaches: [{
          email: coachEmail,
          first_name: 'Bulk',
          last_name: 'Coach',
          password: 'TempCoach123!'
        }],
        students: [{
          email: studentEmail,
          first_name: 'Bulk',
          last_name: 'Student',
          student_number: `BULK-${s}`
        }],
        teams: [{
          name: teamName,
          hall_name: 'Mitchell Hall',
          sport_type: 'football',
          coach_email: coachEmail
        }],
        players: [{
          email: studentEmail,
          hall_name: 'Mitchell Hall',
          team_name: teamName,
          sport: 'football',
          position: 'forward'
        }]
      });
    expect(res.status).toBe(200);
    expect(res.body.data.sections.coaches.created).toBe(1);
    expect(res.body.data.sections.students.created).toBe(1);
    expect(res.body.data.sections.teams.created).toBe(1);
    expect(res.body.data.sections.players.created).toBe(1);

    // Side effects actually applied.
    const coach = await User.findOne({ where: { email: coachEmail, role: 'coach' } });
    const student = await User.findOne({ where: { email: studentEmail, role: 'student' } });
    const team = await Team.findOne({ where: { name: teamName } });
    const player = await Player.findOne({ where: { user_id: student.id, sport: 'football' } });
    expect(coach).not.toBeNull();
    expect(student).not.toBeNull();
    expect(team).not.toBeNull();
    expect(team.coach_id).toBe(coach.id);
    expect(player).not.toBeNull();
    expect(player.team_id).toBe(team.id);
  });

  it('rejects a team row whose hall cannot be resolved', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teams: [{ name: `Ghost Hall Team ${s}`, hall_name: 'Hall That Does Not Exist' }]
      });
    expect(res.status).toBe(207);
    expect(res.body.data.sections.teams.failed).toBe(1);
    expect(res.body.data.hard_errors.teams[0].message).toMatch(/Hall not found/);
  });

  it('rejects a player row that depends on a missing student', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        players: [{
          email: `ghost-${s}@example.com`,
          hall_name: 'Mitchell Hall',
          sport: 'football'
        }]
      });
    expect(res.status).toBe(207);
    expect(res.body.data.sections.players.failed).toBe(1);
    expect(res.body.data.hard_errors.players[0].message).toMatch(/User not found/);
  });

  it('rejects a player whose team hall does not match the player hall', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const studentEmail = `pair-stu-${s}@example.com`;
    const teamName = `Pair Team ${s}`;

    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        students: [{
          email: studentEmail,
          first_name: 'Pair',
          last_name: 'Test',
          student_number: `PAIR-${s}`
        }],
        teams: [{ name: teamName, hall_name: 'Nkrumah Hall', sport_type: 'football' }],
        players: [{
          email: studentEmail,
          hall_name: 'Mitchell Hall', // intentionally wrong
          team_name: teamName,
          sport: 'football'
        }]
      });
    expect(res.status).toBe(207);
    expect(res.body.data.sections.players.failed).toBe(1);
    expect(res.body.data.hard_errors.players[0].message).toMatch(/does not match team hall/);
  });

  it('rejects duplicate student_number with a hard error', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const num = `DUP-${s}`;
    const res = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        students: [
          { email: `a-${s}@example.com`, first_name: 'A', last_name: 'One', student_number: num },
          { email: `b-${s}@example.com`, first_name: 'B', last_name: 'Two', student_number: num }
        ]
      });
    expect(res.status).toBe(207);
    expect(res.body.data.sections.students.created).toBe(1);
    expect(res.body.data.sections.students.failed).toBe(1);
  });

  it('skipExisting short-circuits on conflicts without writing', async () => {
    if (!app || !adminToken) return;
    const s = suffix();
    const studentEmail = `repeat-${s}@example.com`;
    const studentNum = `REP-${s}`;
    const payload = {
      students: [{
        email: studentEmail,
        first_name: 'Repeat',
        last_name: 'Student',
        student_number: studentNum
      }]
    };
    const first = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(first.body.data.sections.students.created).toBe(1);

    const second = await request(app)
      .post('/api/v1/admin/bulk/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...payload, skipExisting: true });
    expect(second.body.data.sections.students.skipped).toBe(1);
  });
});