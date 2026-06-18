const request = require('supertest');
const { sequelize } = require('../models');

// Pre-flight: tests hit Postgres. Suite warns and early-returns if the DB
// is not reachable so `jest` does not fail on machines without a running
// database.
const dbReady = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (err) {
    return false;
  }
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

describe('POST /api/v1/auth/register', () => {
  let app;

  beforeAll(async () => {
    if (!(await dbReady())) {
      console.warn('Skipping auth tests: database not reachable');
      return;
    }
    app = buildApp();
  });

  it('rejects client-supplied role other than student', async () => {
    if (!app) return;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'Test',
        last_name: 'User',
        student_number: `T-${Date.now()}`,
        role: 'admin' // attempted escalation
      });
    expect(res.status).toBe(400);
  });

  it('rejects registration without student_number', async () => {
    if (!app) return;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `nostud-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'No',
        last_name: 'Number'
      });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate student_number with 409', async () => {
    if (!app) return;
    const num = `DUP-${Date.now()}`;
    const a = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `a-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'A',
        last_name: 'One',
        student_number: num
      });
    expect([201, 409]).toContain(a.status);

    const b = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `b-${Date.now()}@example.com`,
        password: 'strongpassword',
        first_name: 'B',
        last_name: 'Two',
        student_number: num
      });
    expect(b.status).toBe(409);
  });
});
