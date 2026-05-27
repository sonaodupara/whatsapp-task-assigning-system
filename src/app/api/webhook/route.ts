import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID!;
  const token = process.env.META_WHATSAPP_TOKEN!;
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

async function updateTaskStatus(phoneNumber: string, from: string, newStatus: string, shortId?: string) {
  let tasks: any[] = [];

  if (shortId) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
      .ilike("id", `${shortId.toLowerCase()}%`)
      .limit(1);
    tasks = data || [];
  }

  if (tasks.length === 0) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    tasks = data || [];
  }

  return tasks;
}

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

export async function POST(request: Request) {
  const data = await request.json();

  const value = data?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  console.log("RAW TYPE:", message?.type, "FROM:", message?.from);

  if (!message) return NextResponse.json({ status: "ok" });

  const from = message.from;
  const phoneNumber = `+${from}`;
  const employerNumber = process.env.EMPLOYER_WHATSAPP!;
  const empNorm = employerNumber.startsWith("+") ? employerNumber : `+${employerNumber}`;
  const isEmployer = phoneNumber === empNorm;

  const handleStatusUpdate = async (newStatus: string, shortId?: string) => {
    const tasks = await updateTaskStatus(phoneNumber, from, newStatus, shortId);
    if (tasks.length > 0) {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", tasks[0].id);
      const replies: Record<string, string> = {
        completed: `✅ Task "${tasks[0].title}" marked as completed! Great work.`,
        in_progress: `⏳ Task "${tasks[0].title}" marked as in progress. Keep going!`,
        cannot_complete: `❌ Task "${tasks[0].title}" marked as cannot complete. Manager notified.`,
      };
      await sendWhatsAppMessage(phoneNumber, replies[newStatus]);
      if (newStatus === "completed") await sendWhatsAppMessage(empNorm, `✅ Task completed: "${tasks[0].title}"`);
      if (newStatus === "cannot_complete") await sendWhatsAppMessage(empNorm, `⚠️ Cannot complete: "${tasks[0].title}". Please follow up.`);
      if (newStatus === "in_progress") await sendWhatsAppMessage(empNorm, `⏳ In progress: "${tasks[0].title}"`);
    } else {
      await sendWhatsAppMessage(phoneNumber, `✅ Response received. Thank you!`);
    }
  };

  // ── TYPE 1: Interactive button reply ─────────────────────────────────────
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const payload = message.interactive.button_reply.id;
    console.log("INTERACTIVE BUTTON:", payload);
    const parts = payload.split("_");
    const btnStatus = parts[0];
    const shortId = parts[1];
    const newStatus = btnStatus === "DONE" ? "completed" : btnStatus === "PROGRESS" ? "in_progress" : "cannot_complete";
    await handleStatusUpdate(newStatus, shortId);
    return NextResponse.json({ status: "ok" });
  }

  // ── TYPE 2: Quick reply button (template button tap) ─────────────────────
  if (message.type === "button") {
    const buttonText = message.button?.text?.toUpperCase() || "";
    const buttonPayload = message.button?.payload?.toUpperCase() || "";
    console.log("QUICK REPLY BUTTON text:", buttonText, "payload:", buttonPayload);

    const combined = buttonPayload || buttonText;
    const newStatus = combined.includes("DONE") ? "completed" : combined.includes("PROGRESS") ? "in_progress" : "cannot_complete";
    await handleStatusUpdate(newStatus);
    return NextResponse.json({ status: "ok" });
  }

  const body = message.text?.body?.trim() || "";

  // ── EMPLOYER sending task via WhatsApp ───────────────────────────────────
  if (isEmployer) {
    const upperBody = body.toUpperCase();
    if (upperBody.startsWith("DONE") || upperBody.startsWith("PROGRESS") || upperBody.startsWith("CANCEL")) {
      return NextResponse.json({ status: "ok" });
    }

    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a task extraction assistant. Today is ${new Date().toISOString()} (IST = UTC+5:30).
Extract task details. Return ONLY valid JSON:
{"title": "task description", "employee_name": "name or null", "deadline": "ISO string or null", "priority": "High or Medium or Low", "notes": "notes or null"}`
          },
          { role: "user", content: body }
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      const { data: allEmployees } = await supabase.from("employees").select("*");

      let employee: any = null;
      if (parsed.employee_name && parsed.employee_name !== "null" && parsed.employee_name !== null) {
        const matches = allEmployees?.filter((e: any) =>
          e.name.toLowerCase().includes(parsed.employee_name.toLowerCase())
        );
        if (matches && matches.length > 0) employee = matches[0];
      }

      if (!employee) {
        const empList = allEmployees?.map((e: any) => `• ${e.name}`).join("\n") || "None added yet";
        await sendWhatsAppMessage(empNorm,
          `Please mention the employee name.\n\nAvailable:\n${empList}\n\nExample: "Tell Sona to clean office by 5pm"`
        );
        return NextResponse.json({ status: "ok" });
      }

      const { data: taskData, error } = await supabase
        .from("tasks")
        .insert([{
          title: parsed.title,
          assigned_to: employee.phone,
          status: "pending",
          notes: parsed.notes || null,
          deadline: parsed.deadline || null,
          priority: parsed.priority || "Medium",
          user_id: employee.user_id,
        }])
        .select();

      if (error || !taskData) {
        await sendWhatsAppMessage(empNorm, `⚠️ Error: ${error?.message}`);
        return NextResponse.json({ status: "ok" });
      }

      const task = taskData[0];
      const shortId = task.id.split("-")[0].toUpperCase();
      const priorityStr = { High: "🔴 High", Medium: "🟡 Medium", Low: "🟢 Low" }[parsed.priority as string] || "🟡 Medium";
      const deadlineStr = parsed.deadline
        ? new Date(parsed.deadline).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "No deadline";

      await sendWhatsAppMessage(employee.phone,
        `📋 *New Task Assigned*\n\nTask: ${parsed.title}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}\n\nReply with:\n✅ DONE ${shortId} — mark as completed\n⏳ PROGRESS ${shortId} — mark as in progress\n❌ CANCEL ${shortId} — cannot complete`
      );

      await sendWhatsAppMessage(empNorm,
        `✅ Task assigned to ${employee.name}\nTask: ${parsed.title}\nID: ${shortId}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}`
      );

    } catch (err: any) {
      await sendWhatsAppMessage(empNorm, `⚠️ Error: ${err.message}`);
    }

    return NextResponse.json({ status: "ok" });
  }

  // ── EMPLOYEE text reply ───────────────────────────────────────────────────
  const upperBody = body.toUpperCase();

  if (upperBody.startsWith("DONE")) {
    const shortId = upperBody.split(" ")[1];
    await handleStatusUpdate("completed", shortId);
    return NextResponse.json({ status: "ok" });
  }

  if (upperBody.startsWith("PROGRESS")) {
    const shortId = upperBody.split(" ")[1];
    await handleStatusUpdate("in_progress", shortId);
    return NextResponse.json({ status: "ok" });
  }

  if (upperBody.startsWith("CANCEL")) {
    const shortId = upperBody.split(" ")[1];
    await handleStatusUpdate("cannot_complete", shortId);
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ status: "ok" });
}