import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a task extraction assistant. Extract task details from messages and return ONLY a JSON object with no extra text, markdown, or explanation. Format: {\"title\": \"task description\", \"assigned_to\": \"phone number with country code or unknown\"}"
        },
        {
          role: "user",
          content: message
        }
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json({ success: true, task: parsed });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
