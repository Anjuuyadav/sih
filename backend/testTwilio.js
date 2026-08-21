require("dotenv").config();

const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function createMessage() {
  try {
    const message = await client.messages.create({
      body: "sms_appointment_reminders",
      from: "+17372508034",
      to: "+919266042753",
    });

    console.log("SMS SENT SUCCESSFULLY");
    console.log("Message SID:", message.sid);
  } catch (error) {
    console.error("SMS FAILED");
    console.error(error);
  }
}

createMessage();