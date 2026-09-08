import { NextResponse } from "next/server";
import { sendMetaTextMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetPhone = body.to || process.env.EMPLOYER_WHATSAPP;

    if (!targetPhone) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number required (provide 'to' in JSON body or set EMPLOYER_WHATSAPP)" },
        { status: 400 }
      );
    }

    const testMessage = body.message || "👋 Hello! This is a test notification from TaskSend via Meta WhatsApp Cloud API.";

    const result = await sendMetaTextMessage(targetPhone, testMessage);

    if (result.ok && !result.data?.error) {
      return NextResponse.json({
        success: true,
        provider: "Meta WhatsApp Cloud API",
        message: "Test message dispatched successfully",
        metaResponse: result.data,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.data?.error?.message || "Meta API error",
      details: result.data,
    }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}