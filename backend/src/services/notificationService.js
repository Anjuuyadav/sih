const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const repository = require('../repositories/notificationRepository');

dotenv.config();

const ACCEPTED_TYPE = 'BOOKING_ACCEPTED';
const REJECTED_TYPE = 'BOOKING_REJECTED';
let providerOverrides = {};

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const formatTime = (value) => String(value || '').slice(0, 5);

const practitionerName = (context) => [context.PractitionerFirstName, context.PractitionerLastName]
  .filter(Boolean)
  .join(' ')
  .trim() || 'Your practitioner';

const buildAcceptedContent = (context) => {
  const schedule = context.sessions.map((session) => (
    `Session ${session.SessionNumber}: ${formatDate(session.SessionDate)} ${formatTime(session.StartTime)} - ${formatTime(session.EndTime)}`
  )).join('\n');
  const subject = 'Panchkarma Therapy Appointment Confirmed';
  const message = `Hello ${context.PatientName},

Your Panchkarma therapy appointment has been confirmed.

Therapy: ${context.TherapyName}
Practitioner: ${practitionerName(context)}
Number of sessions: ${context.NumberOfSessions}

Schedule:
${schedule}

Status: CONFIRMED

Please arrive on time for your scheduled therapy.`;
  const sms = `Panchkarma appointment confirmed. Therapy: ${context.TherapyName}. Practitioner: ${practitionerName(context)}. First session: ${formatDate(context.sessions[0]?.SessionDate)} at ${formatTime(context.sessions[0]?.StartTime)}.`;
  return { subject, message, sms };
};

const buildRejectedContent = (context) => {
  const schedule = context.sessions.map((session) => (
    `Session ${session.SessionNumber}: ${formatDate(session.SessionDate)} ${formatTime(session.StartTime)} - ${formatTime(session.EndTime)}`
  )).join('\n');
  const subject = 'Panchkarma Therapy Appointment Rejected';
  const message = `Hello ${context.PatientName},

Your Panchkarma therapy booking request has been rejected.

Therapy: ${context.TherapyName}
Practitioner: ${practitionerName(context)}
Requested sessions: ${context.NumberOfSessions}

Requested schedule:
${schedule}

Reason: ${context.RejectionReason || 'The practitioner was unable to accept the requested schedule.'}
Status: REJECTED

Please choose another available schedule.`;
  const sms = `Your Panchkarma booking was rejected. Therapy: ${context.TherapyName}. Reason: ${context.RejectionReason || 'Practitioner unavailable for requested schedule.'}`;
  return { subject, message, sms };
};

const createEmailTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error('Email provider configuration is missing.');
  }
  return {
    from: SMTP_FROM,
    transport: nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    }),
  };
};

const sendEmailNotification = async (context, content) => {
  if (providerOverrides.email) return providerOverrides.email(context, content);
  if (!context.Email) throw new Error('Patient email address is missing.');
  const { transport, from } = createEmailTransport();
  await transport.sendMail({
    from,
    to: context.Email,
    subject: content.subject,
    text: content.message,
  });
};

const createSmsClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('SMS provider configuration is missing.');
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

const sendSmsNotification = async (context, content) => {
  if (providerOverrides.sms) return providerOverrides.sms(context, content);
  if (!context.ContactNumber) throw new Error('Patient contact number is missing.');
  const client = createSmsClient();
  await client.messages.create({
    body: content.sms,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: context.ContactNumber,
  });
};

const logFailure = (type, channel, therapyPlanId, userId, error) => {
  console.error('Notification delivery failed', {
    type,
    channel,
    therapyPlanId,
    userId,
    error: error.message,
  });
};

const processChannel = async (context, type, channel, content) => {
  const values = {
    userId: context.UserId,
    therapyPlanId: context.TherapyPlanId,
    sessionId: null,
    notificationType: type,
    channel,
    subject: channel === 'EMAIL' ? content.subject : null,
    message: channel === 'EMAIL' ? content.message : content.sms,
  };

  try {
    const created = await repository.createNotificationIfAbsent(values);
    if (created.duplicate) return { channel, status: created.status, duplicate: true };
    const notificationId = created.notificationId;
    try {
      if (channel === 'EMAIL') await sendEmailNotification(context, content);
      else await sendSmsNotification(context, content);
      await repository.markNotificationSent(notificationId);
      return { channel, status: 'SENT' };
    } catch (error) {
      logFailure(type, channel, context.TherapyPlanId, context.UserId, error);
      try {
        await repository.markNotificationFailed(notificationId, error.message);
      } catch (persistError) {
        logFailure(type, channel, context.TherapyPlanId, context.UserId, persistError);
      }
      return { channel, status: 'FAILED', error: error.message };
    }
  } catch (error) {
    logFailure(type, channel, context.TherapyPlanId, context.UserId, error);
    return { channel, status: 'FAILED', error: error.message };
  }
};

const sendBookingNotifications = async (therapyPlanId, type) => {
  try {
    const context = await repository.getBookingNotificationContext(therapyPlanId);
    if (!context) return { status: 'FAILED', channels: [], error: 'Booking not found.' };
    const content = type === ACCEPTED_TYPE
      ? buildAcceptedContent(context)
      : buildRejectedContent(context);
    const channels = await Promise.all([
      processChannel(context, type, 'EMAIL', content),
      processChannel(context, type, 'SMS', content),
    ]);
    const status = channels.every((channel) => channel.status === 'SENT' || channel.duplicate)
      ? 'SENT'
      : channels.some((channel) => channel.status === 'SENT')
        ? 'PARTIAL'
        : 'FAILED';
    return { status, channels };
  } catch (error) {
    console.error('Notification processing failed', { type, therapyPlanId, error: error.message });
    return { status: 'FAILED', channels: [], error: error.message };
  }
};

const sendBookingAcceptedNotifications = (therapyPlanId) => sendBookingNotifications(therapyPlanId, ACCEPTED_TYPE);
const sendBookingRejectedNotifications = (therapyPlanId) => sendBookingNotifications(therapyPlanId, REJECTED_TYPE);

module.exports = {
  sendBookingAcceptedNotifications,
  sendBookingRejectedNotifications,
  __testables: {
    buildAcceptedContent,
    buildRejectedContent,
    processChannel,
    setProviderOverrides: (overrides) => { providerOverrides = overrides || {}; },
  },
};