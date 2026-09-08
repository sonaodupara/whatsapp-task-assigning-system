import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message string required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "GROQ_API_KEY environment variable not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an AI task parsing assistant. Parse natural language instructions into task attributes.
Return ONLY valid JSON with format:
{
  "title": "Clear description of the work to be done",
  "employee_name": "Name of person assigned or null",
  "priority": "High" | "Medium" | "Low",
  "deadline": "ISO date-time string or null",
  "notes": "Additional instructions or null"
}`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ success: true, task: parsed });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
