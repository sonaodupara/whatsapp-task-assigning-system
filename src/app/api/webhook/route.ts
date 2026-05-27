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

// Find tasks by phone — handles both +91... and 91... formats
async function findTasksByPhone(phone: string, filters: any = {}) {
  const withPlus = phone.startsWith("+") ? phone : `+${phone}`;
  const withoutPlus = phone.startsWith("+") ? phone.slice(1) : phone;

  const query = supabase.from("tasks").select("id, title, assigned_to");
  Object.entries(filters).forEach(([key, val]) => query.eq(key, val));

  const { data } = await query.or(
    `assigned_to.eq.${withPlus},assigned_to.eq.${withoutPlus}`
  );
  return data || [];
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
  console.log("WEBHOOK TYPE:", value?.statuses ? "status_update" : "message");
  console.log("MESSAGE TYPE:", message?.type);
  console.log("RAW VALUE:", JSON.stringify(value)?.slice(0, 500));
  if (!message) return NextResponse.json({ status: "ok" });

  const from = message.from; // e.g. 917025423667
  const phoneNumber = `+${from}`; // e.g. +917025423667
  const employerNumber = process.env.EMPLOYER_WHATSAPP!;

  // Normalize employer number for comparison
  const empNorm = employerNumber.startsWith("+") ? employerNumber : `+${employerNumber}`;
  const isEmployer = phoneNumber === empNorm;

  // Handle quick reply button (template buttons)
if (message.type === "button") {
  console.log("QUICK REPLY BUTTON:", JSON.stringify(message.button));
  const buttonText = message.button?.text?.toUpperCase();
  const newStatus =
    buttonText === "DONE" ? "completed" :
    buttonText === "IN PROGRESS" ? "in_progress" : "cannot_complete";

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title")
    .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (tasks && tasks.length > 0) {
    await supabase.from("tasks").update({ status: newStatus }).eq("id", tasks[0].id);
    const replies: Record<string, string> = {
      completed: `✅ Task "${tasks[0].title}" marked as completed! Great work.`,
      in_progress: `⏳ Task "${tasks[0].title}" marked as in progress. Keep going!`,
      cannot_complete: `❌ Task "${tasks[0].title}" marked as cannot complete. Manager notified.`,
    };
    await sendWhatsAppMessage(phoneNumber, replies[newStatus]);
    if (newStatus === "completed") await sendWhatsAppMessage(empNorm, `✅ Task completed: "${tasks[0].title}"`);
    if (newStatus === "cannot_complete") await sendWhatsAppMessage(empNorm, `⚠️ Cannot complete: "${tasks[0].title}"`);
  }
  return NextResponse.json({ status: "ok" });
}

  // ── BUTTON REPLY ─────────────────────────────────────────────────────────
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const buttonPayload = message.interactive.button_reply.id;
    console.log("BUTTON REPLY:", buttonPayload, "FROM:", from, "PHONE:", phoneNumber);

    const parts = buttonPayload.split("_");
    const btnStatus = parts[0];
    const shortId = parts[1];

    const newStatus =
      btnStatus === "DONE" ? "completed" :
      btnStatus === "PROGRESS" ? "in_progress" : "cannot_complete";

    console.log("STATUS:", newStatus, "SHORTID:", shortId);

    // Always use fallback — get latest pending task for this phone
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("id, title")
      .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("TASKS FOUND:", tasks, "ERROR:", taskError);

    if (tasks && tasks.length > 0) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", tasks[0].id);

      console.log("UPDATE ERROR:", updateError);

      const replies: Record<string, string> = {
        completed: `✅ Task "${tasks[0].title}" marked as completed! Great work.`,
        in_progress: `⏳ Task "${tasks[0].title}" marked as in progress. Keep going!`,
        cannot_complete: `❌ Task "${tasks[0].title}" marked as cannot complete. Manager notified.`,
      };
      await sendWhatsAppMessage(phoneNumber, replies[newStatus]);

      if (newStatus === "completed") {
        await sendWhatsAppMessage(empNorm, `✅ Task completed: "${tasks[0].title}"`);
      }
      if (newStatus === "cannot_complete") {
        await sendWhatsAppMessage(empNorm, `⚠️ Cannot complete: "${tasks[0].title}". Please follow up.`);
      }
    } else {
      console.log("NO TASKS FOUND for phone:", phoneNumber, from);
      await sendWhatsAppMessage(phoneNumber, `✅ Response received. Thank you!`);
    }

    return NextResponse.json({ status: "ok" });
  }

  const body = message.text?.body?.trim() || "";

  // ── EMPLOYER sending task via WhatsApp ───────────────────────────────────
  if (isEmployer) {
    // Check if employer is replying DONE to their own task confirmation — ignore
    const upperBody = body.toUpperCase();
    if (upperBody === "DONE" || upperBody.startsWith("DONE ")) {
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
        `*New Task Assigned* 📋\n\nTask ID: ${shortId}\nTask: ${parsed.title}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}\n\nReply: *DONE ${shortId}* when completed.`
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
    const withPlus = phoneNumber;
    const withoutPlus = from;

    let tasks: any[] = [];

    if (shortId) {
      const { data } = await supabase
        .from("tasks")
        .select("id, title")
        .or(`assigned_to.eq.${withPlus},assigned_to.eq.${withoutPlus}`)
        .eq("status", "pending")
        .ilike("id", `${shortId.toLowerCase()}%`)
        .limit(1);
      tasks = data || [];
    }

    if (tasks.length === 0) {
      const { data } = await supabase
        .from("tasks")
        .select("id, title")
        .or(`assigned_to.eq.${withPlus},assigned_to.eq.${withoutPlus}`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      tasks = data || [];
    }

    if (tasks.length > 0) {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", tasks[0].id);
      await sendWhatsAppMessage(phoneNumber, `✅ Task "${tasks[0].title}" completed! Great work.`);
      await sendWhatsAppMessage(empNorm, `✅ ${phoneNumber} completed: "${tasks[0].title}"`);
    }

    return NextResponse.json({ status: "ok" });
  }

  // Unknown message from employee — silent ignore, no confusing reply
  return NextResponse.json({ status: "ok" });
}