import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID!;
  const token = process.env.META_WHATSAPP_TOKEN!;

  await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );
}

// ── GET — Meta webhook verification ─────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST — Receive messages from Meta ───────────────────────────────────────
export async function POST(request: Request) {
  const data = await request.json();

  // Extract message from Meta's payload structure
  const entry = data?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  // Ignore non-message events (status updates, etc.)
  if (!message) {
    return NextResponse.json({ status: "ok" });
  }

  const from = message.from;
const phoneNumber = `+${from}`;
const employerNumber = process.env.EMPLOYER_WHATSAPP!;

// Handle button replies
if (message.type === "interactive" && message.interactive?.type === "button_reply") {
  const buttonPayload = message.interactive.button_reply.id;
  const buttonTitle = message.interactive.button_reply.title;

  // Extract task ID from button payload (format: STATUS_TASKID)
  const parts = buttonPayload.split("_");
  const status = parts[0];
  const shortId = parts[1];

  if (shortId) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("assigned_to", phoneNumber)
      .eq("status", "pending")
      .ilike("id", `${shortId.toLowerCase()}%`);

    if (tasks && tasks.length > 0) {
      const newStatus = status === "DONE" ? "completed" : 
                        status === "PROGRESS" ? "in_progress" : "cannot_complete";
      
      await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", tasks[0].id);

      const replies: Record<string, string> = {
        completed: `✅ Task marked as completed! Great work.`,
        in_progress: `⏳ Task marked as in progress. Keep going!`,
        cannot_complete: `❌ Task marked as cannot complete. Your manager has been notified.`,
      };

      await sendWhatsAppMessage(phoneNumber, replies[newStatus]);
      return NextResponse.json({ status: "ok" });
    }
  }
  return NextResponse.json({ status: "ok" });
}

const body = message.text?.body?.trim() || "";

  // ── EMPLOYER → assign task via WhatsApp ────────────────────────────────
  if (phoneNumber === employerNumber) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a task extraction assistant. Today's date and time is ${new Date().toISOString()} (IST is UTC+5:30).
Extract task details from the employer's message.
Return ONLY valid JSON with no extra text or markdown:
{"title": "task description", "employee_name": "name of employee", "deadline": "ISO datetime string or null", "priority": "High or Medium or Low", "notes": "any additional notes or null"}
For deadlines, convert relative times like "today 5pm" or "tomorrow morning" into a full ISO datetime string using the current date above.`
          },
          { role: "user", content: body }
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Find employee by name
      const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .ilike("name", `%${parsed.employee_name}%`);

      if (!employees || employees.length === 0) {
        await sendWhatsAppMessage(
          employerNumber,
          `❌ Employee "${parsed.employee_name}" not found. Please add them to the dashboard first.`
        );
        return NextResponse.json({ status: "ok" });
      }

      const employee = employees[0];

      // Save task to Supabase
      const { data: taskData } = await supabase
        .from("tasks")
        .insert([{
          title: parsed.title,
          assigned_to: employee.phone,
          status: "pending",
          notes: parsed.notes || null,
          deadline: parsed.deadline || null,
          priority: parsed.priority || "Medium",
        }])
        .select();

      const task = taskData![0];
      const shortId = task.id.split("-")[0].toUpperCase();

      // Format priority with emoji
      const pColors: Record<string, string> = {
        High: "🔴 High",
        Medium: "🟡 Medium",
        Low: "🟢 Low",
      };
      const priorityStr = pColors[parsed.priority] || "🟡 Medium";

      // Format deadline
      let deadlineStr = "None";
      if (parsed.deadline) {
        const d = new Date(parsed.deadline);
        deadlineStr = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }

      // Send task to employee
      let msgBody = `*New Task Assigned* 📋\n\n`;
      msgBody += `*Task ID:* ${shortId}\n`;
      msgBody += `*Task:* ${parsed.title}\n`;
      msgBody += `*Priority:* ${priorityStr}\n`;
      msgBody += `*Deadline:* ${deadlineStr}\n`;
      if (parsed.notes) msgBody += `*Notes:* ${parsed.notes}\n`;
      msgBody += `\n*Reply:* DONE ${shortId} when completed.`;

      await sendWhatsAppMessage(employee.phone, msgBody);

      // Confirm back to employer
      await sendWhatsAppMessage(
        employerNumber,
        `✅ Task "${parsed.title}" assigned to ${employee.name} and sent via WhatsApp.\n\nTask ID: ${shortId}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}`
      );

      return NextResponse.json({ status: "ok" });

    } catch (err: any) {
      await sendWhatsAppMessage(
        employerNumber,
        `⚠️ Error processing task: ${err.message}`
      );
      return NextResponse.json({ status: "ok" });
    }
  }

  // ── EMPLOYEE → update task status ──────────────────────────────────────
  const upperBody = body.toUpperCase();
  if (upperBody.startsWith("DONE")) {
    const parts = upperBody.split(" ");
    const shortId = parts[1];

    if (shortId) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("assigned_to", phoneNumber)
        .eq("status", "pending")
        .ilike("id", `${shortId.toLowerCase()}%`);

      if (tasks && tasks.length > 0) {
        await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", tasks[0].id);

        await sendWhatsAppMessage(phoneNumber, `✅ Task ${shortId} marked as completed! Great work.`);
        return NextResponse.json({ status: "ok" });
      }
    }

    // Fallback: mark latest pending task complete
    await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("assigned_to", phoneNumber)
      .eq("status", "pending");

    await sendWhatsAppMessage(phoneNumber, `✅ Task marked as completed!`);
    return NextResponse.json({ status: "ok" });
  }

  // ── Default reply ───────────────────────────────────────────────────────
  await sendWhatsAppMessage(
    phoneNumber,
    `Reply DONE followed by your Task ID to complete a task.\nExample: DONE A1B2C3`
  );

  return NextResponse.json({ status: "ok" });
}