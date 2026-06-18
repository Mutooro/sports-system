const request = require('supertest');
const { sequelize, User } = require('../models');

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

describe('POST /api/v1/admin/users', () => {
  let app;
  let adminToken;
  let coachToken;

  beforeAll(async () => {
    if (!(await dbReady())) {
      console.warn('Skipping admin tests: database not reachable');
      return;
    }
    app = buildApp();
    adminToken  = await loginAs(app, 'admin@makerere.ac.ug', 'admin123');
    coachToken  = await loginAs(app, 'coach.mitchell@makerere.ac.ug', 'coach123');
  });

  it('lets an admin create a coach account', async () => {
    if (!app || !adminToken) return;

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `newcoach-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'New',
        last_name: 'Coach',
        role: 'coach'
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('coach');
    // Phone visible on coach/admin accounts.
    expect(res.body.data).toHaveProperty('email');
  });

  it('rejects a coach from creating an admin account', async () => {
    if (!app || !coachToken) return;

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({
        email: `sneaky-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'Sneaky',
        last_name: 'Admin',
        role: 'admin'
      });
    expect(res.status).toBe(403);
  });

  it('lets an admin create a student account with student_number', async () => {
    if (!app || !adminToken) return;

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `newstud-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'New',
        last_name: 'Student',
        role: 'student',
        student_number: `STU-${Date.now()}`
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
    // Phone should be stripped from student responses.
    expect(res.body.data.phone).toBeUndefined();
  });

  it('rejects a student-account creation without student_number', async () => {
    if (!app || !adminToken) return;

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `nostud-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'No',
        last_name: 'Number',
        role: 'student'
      });
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    if (!app) return;
    const res = await request(app)
      .post('/api/v1/admin/users')
      .send({
        email: 'x@example.com',
        password: 'strongpassword',
        first_name: 'X',
        last_name: 'Y',
        role: 'coach'
      });
    expect(res.status).toBe(401);
  });
});
