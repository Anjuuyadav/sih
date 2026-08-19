const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/notificationRepository');
const notificationService = require('../backend/src/services/notificationService');

const context = {
  TherapyPlanId: 25,
  UserId: 10,
  PatientName: 'Anju Yadav',
  Email: 'anju@example.com',
  ContactNumber: '+919876543210',
  TherapyName: 'Abhyanga',
  PractitionerFirstName: 'Dr.',
  PractitionerLastName: 'Sharma',
  NumberOfSessions: 2,
  RejectionReason: 'Schedule unavailable.',
  sessions: [
    { SessionNumber: 1, SessionDate: '2099-08-25', StartTime: '10:30', EndTime: '11:30' },
    { SessionNumber: 2, SessionDate: '2099-08-27', StartTime: '10:30', EndTime: '11:30' },
  ],
};

const createStub = (overrides = {}) => {
  const records = [];
  let id = 0;
  const methods = {
    getBookingNotificationContext: async () => context,
    getExistingNotification: async (values) => records.find((record) => (
      record.userId === values.userId
      && record.therapyPlanId === values.therapyPlanId
      && record.notificationType === values.notificationType
      && record.channel === values.channel
    )) || null,
    createNotification: async (values) => {
      const record = { ...values, notificationId: ++id, status: 'PENDING' };
      records.push(record);
      return record.notificationId;
    },
    createNotificationIfAbsent: async (values) => {
      const existing = records.find((record) => (
        record.userId === values.userId
        && record.therapyPlanId === values.therapyPlanId
        && record.notificationType === values.notificationType
        && record.channel === values.channel
      ));
      if (existing) return { notificationId: existing.notificationId, duplicate: true, status: existing.status };
      const record = { ...values, notificationId: ++id, status: 'PENDING' };
      records.push(record);
      return { notificationId: record.notificationId, duplicate: false, status: 'PENDING' };
    },
    markNotificationSent: async (notificationId) => {
      records.find((record) => record.notificationId === notificationId).status = 'SENT';
    },
    markNotificationFailed: async (notificationId, errorMessage) => {
      const record = records.find((item) => item.notificationId === notificationId);
      record.status = 'FAILED';
      record.errorMessage = errorMessage;
    },
    ...overrides,
  };
  return { methods, records };
};

const withRepository = async (stub, callback) => {
  const original = {};
  Object.keys(stub.methods).forEach((key) => {
    original[key] = repository[key];
    repository[key] = stub.methods[key];
  });
  try {
    return await callback();
  } finally {
    Object.keys(original).forEach((key) => { repository[key] = original[key]; });
  }
};

const withProviders = async (providers, callback) => {
  notificationService.__testables.setProviderOverrides(providers);
  try {
    return await callback();
  } finally {
    notificationService.__testables.setProviderOverrides({});
  }
};

test('accepted email and SMS succeed and use the database recipient', async () => {
  const stub = createStub();
  const recipients = [];
  const result = await withRepository(stub, () => withProviders({
    email: async (value) => { recipients.push(value.Email); },
    sms: async (value) => { recipients.push(value.ContactNumber); },
  }, () => notificationService.sendBookingAcceptedNotifications(25)));
  assert.equal(result.status, 'SENT');
  assert.deepEqual(recipients.sort(), ['+919876543210', 'anju@example.com']);
  assert.deepEqual(stub.records.map((record) => record.status).sort(), ['SENT', 'SENT']);
});

test('rejected email and SMS succeed with generated rejection content', async () => {
  const stub = createStub();
  const content = notificationService.__testables.buildRejectedContent(context);
  assert.match(content.message, /Schedule unavailable/);
  const result = await withRepository(stub, () => withProviders({ email: async () => {}, sms: async () => {} }, () => notificationService.sendBookingRejectedNotifications(25)));
  assert.equal(result.status, 'SENT');
  assert.deepEqual(stub.records.map((record) => record.status).sort(), ['SENT', 'SENT']);
});

test('email failure is recorded while SMS can still succeed', async () => {
  const stub = createStub();
  const result = await withRepository(stub, () => withProviders({
    email: async () => { throw new Error('SMTP unavailable'); },
    sms: async () => {},
  }, () => notificationService.sendBookingAcceptedNotifications(25)));
  assert.equal(result.status, 'PARTIAL');
  assert.deepEqual(stub.records.map((record) => record.status).sort(), ['FAILED', 'SENT']);
  assert.equal(stub.records.find((record) => record.channel === 'EMAIL').errorMessage, 'SMTP unavailable');
});

test('both provider failures are isolated and recorded', async () => {
  const stub = createStub();
  const result = await withRepository(stub, () => withProviders({
    email: async () => { throw new Error('SMTP unavailable'); },
    sms: async () => { throw new Error('Twilio unavailable'); },
  }, () => notificationService.sendBookingRejectedNotifications(25)));
  assert.equal(result.status, 'FAILED');
  assert.deepEqual(stub.records.map((record) => record.status).sort(), ['FAILED', 'FAILED']);
});

test('duplicate notification events do not send again', async () => {
  const stub = createStub();
  let sends = 0;
  const providers = { email: async () => { sends += 1; }, sms: async () => { sends += 1; } };
  await withRepository(stub, () => withProviders(providers, async () => {
    await notificationService.sendBookingAcceptedNotifications(25);
    await notificationService.sendBookingAcceptedNotifications(25);
  }));
  assert.equal(sends, 2);
});

test('missing provider configuration fails channels without changing booking state', async () => {
  const stub = createStub();
  const original = { ...process.env };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;
  try {
    const result = await withRepository(stub, () => notificationService.sendBookingAcceptedNotifications(25));
    assert.equal(result.status, 'FAILED');
    assert.deepEqual(stub.records.map((record) => record.status).sort(), ['FAILED', 'FAILED']);
  } finally {
    Object.keys(process.env).forEach((key) => { delete process.env[key]; });
    Object.assign(process.env, original);
  }
});

test('notification database failure is isolated', async () => {
  const result = await withRepository(createStub({
    getBookingNotificationContext: async () => { throw new Error('database unavailable'); },
  }), () => notificationService.sendBookingAcceptedNotifications(25));
  assert.equal(result.status, 'FAILED');
});