const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/patientTherapyRepository');
const service = require('../backend/src/services/patientTherapyService');
const route = require('../backend/src/routes/patientTherapyRoutes');

const withRepository = async (method, callback) => {
  const original = repository.getActiveTherapies;
  repository.getActiveTherapies = method;
  try {
    return await callback();
  } finally {
    repository.getActiveTherapies = original;
  }
};

test('returns active therapies with the catalog fields', async () => {
  const result = await withRepository(async () => [
    { TherapyId: 2, TherapyName: 'Shirodhara', Cost: 1200, Duration: 45, Description: 'Oil therapy' },
    { TherapyId: 1, TherapyName: 'Abhyanga', Cost: 1500, Duration: 60, Description: null },
  ], () => service.getActiveTherapies());

  assert.deepEqual(result, [
    { therapyId: 1, therapyName: 'Abhyanga', cost: 1500, duration: 60, description: null },
    { therapyId: 2, therapyName: 'Shirodhara', cost: 1200, duration: 45, description: 'Oil therapy' },
  ]);
});

test('returns an empty array when no active therapies exist', async () => {
  const result = await withRepository(async () => [], () => service.getActiveTherapies());
  assert.deepEqual(result, []);
});

test('propagates database errors to the existing error middleware', async () => {
  await assert.rejects(
    withRepository(async () => { throw new Error('database unavailable'); }, () => service.getActiveTherapies()),
    /database unavailable/
  );
});

test('route requires authentication and Patient role authorization', () => {
  const layer = route.stack.find((item) => item.route?.path === '/');
  assert.ok(layer);
  assert.equal(layer.route.methods.get, true);
  assert.equal(layer.route.stack.length, 3);
});