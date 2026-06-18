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

// Helper: log in as a coach and return the access token.
async function loginAsCoach(app) {
  // Seeded coach from seedDb.js.
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'coach.mitchell@makerere.ac.ug', password: 'coach123' });
  if (res.status !== 200) return null;
  return res.body.data.accessToken;
}

describe('POST /api/v1/players', () => {
  let app;
  let token;

  beforeAll(async () => {
    if (!(await dbReady())) {
      console.warn('Skipping player tests: database not reachable');
      return;
    }
    app = buildApp();
    token = await loginAsCoach(app);
  });

  it('rejects a player whose team hall does not match the player hall', async () => {
    if (!app || !token) return;

    // Find any two halls.
    const halls = await Hall.findAll({ limit: 2 });
    if (halls.length < 2) {
      console.warn('Need at least 2 halls to run this test');
      return;
    }
    const [hallA, hallB] = halls;

    // Create a team in hall B explicitly for this test, then a student user
    // in hall A. Attempting to create a player in (hallA, teamFromHallB)
    // should be rejected.
    const team = await Team.create({
      name: `Pair Test Team ${Date.now()}`,
      hall_id: hallB.id,
      sport_type: 'football'
    });

    const user = await User.create({
      email: `pair-${Date.now()}@example.com`,
      password: 'strongpassword',
      first_name: 'Pair',
      last_name: 'Test',
      role: 'student',
      student_number: `PAIR-${Date.now()}`
    });

    const res = await request(app)
      .post('/api/v1/players')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: user.id,
        hall_id: hallA.id,
        team_id: team.id,
        sport: 'football'
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match team hall/);
  });

  it('rejects creating a second Player row for the same (user, sport)', async () => {
    if (!app || !token) return;

    const hall = await Hall.findOne();
    const user = await User.create({
      email: `dup-${Date.now()}@example.com`,
      password: 'strongpassword',
      first_name: 'Dup',
      last_name: 'Test',
      role: 'student',
      student_number: `DUP-${Date.now()}`
    });

    const a = await request(app)
      .post('/api/v1/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: user.id, hall_id: hall.id, sport: 'football' });
    expect([201, 400]).toContain(a.status);

    const b = await request(app)
      .post('/api/v1/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: user.id, hall_id: hall.id, sport: 'football' });
    expect(b.status).toBe(409);
  });

  it('rejects creating a Player for a non-student user', async () => {
    if (!app || !token) return;

    const hall = await Hall.findOne();
    // Use a coach as the "wrong role" user.
    const coach = await User.findOne({ where: { role: 'coach' } });
    if (!coach) return;

    const res = await request(app)
      .post('/api/v1/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: coach.id, hall_id: hall.id, sport: 'football' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only users with role/);
  });

  it('DELETE soft-retires the player (sets is_active=false) rather than destroying the row', async () => {
    if (!app || !token) return;

    const hall = await Hall.findOne();
    const user = await User.create({
      email: `retire-${Date.now()}@example.com`,
      password: 'strongpassword',
      first_name: 'Retire',
      last_name: 'Test',
      role: 'student',
      student_number: `RET-${Date.now()}`
    });

    const create = await request(app)
      .post('/api/v1/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: user.id, hall_id: hall.id, sport: 'athletics' });
    expect(create.status).toBe(201);

    const playerId = create.body.data.id;

    const del = await request(app)
      .delete(`/api/v1/players/${playerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const stillThere = await Player.findByPk(playerId);
    expect(stillThere).not.toBeNull();
    expect(stillThere.is_active).toBe(false);
  });
});
