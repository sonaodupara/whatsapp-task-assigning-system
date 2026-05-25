import { NextResponse } from "next/server";
const twilio = require("twilio");

export async function POST() {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: process.env.TWILIO_WHATSAPP_TO,
    body: "Hello! This message was sent from your own app.",
  });

  return NextResponse.json({ success: true, sid: message.sid });
}