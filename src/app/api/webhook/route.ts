import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendMetaTextMessage, sendTaskAssignmentWhatsApp, formatMetaPhoneNumber } from "@/lib/whatsapp";

async function updateTaskStatus(phoneNumber: string, from: string, newStatus: string, shortId?: string) {
  const supabase = getSupabaseAdmin();
  let tasks: any[] = [];

  const cleanPhone = formatMetaPhoneNumber(phoneNumber);
  const cleanFrom = formatMetaPhoneNumber(from);

  if (shortId) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .or(`assigned_to.ilike.%${cleanPhone}%,assigned_to.ilike.%${cleanFrom}%`)
      .ilike("id", `${shortId.toLowerCase()}%`)
      .limit(1);
    tasks = data || [];
  }

  if (tasks.length === 0) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .or(`assigned_to.ilike.%${cleanPhone}%,assigned_to.ilike.%${cleanFrom}%`)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    tasks = data || [];
  }

  return tasks;
}

/**
 * Meta WhatsApp Webhook GET Verification
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("Meta Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Meta WhatsApp Webhook Event Listener (POST)
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const data = await request.json();
    const value = data?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return NextResponse.json({ status: "ok" });

    const from = message.from;
    const phoneNumber = `+${from}`;
    const employerNumber = process.env.EMPLOYER_WHATSAPP || "";
    const empNorm = employerNumber.startsWith("+") ? employerNumber : `+${employerNumber}`;

    const isEmployer = formatMetaPhoneNumber(phoneNumber) === formatMetaPhoneNumber(empNorm);

    const handleStatusUpdate = async (newStatus: string, shortId?: string) => {
      const tasks = await updateTaskStatus(phoneNumber, from, newStatus, shortId);
      if (tasks.length > 0) {
        await supabase.from("tasks").update({ status: newStatus }).eq("id", tasks[0].id);
        const replies: Record<string, string> = {
          completed: `✅ Task "${tasks[0].title}" marked as completed! Great work.`,
          in_progress: `⏳ Task "${tasks[0].title}" marked as in progress.`,
          cannot_complete: `❌ Task "${tasks[0].title}" marked as cannot complete. Manager notified.`,
        };

        await sendMetaTextMessage(from, replies[newStatus] || "Status updated!");

        // Notify employer of status update
        if (empNorm) {
          if (newStatus === "completed") await sendMetaTextMessage(empNorm, `✅ Task completed: "${tasks[0].title}"`);
          if (newStatus === "cannot_complete") await sendMetaTextMessage(empNorm, `⚠️ Cannot complete: "${tasks[0].title}". Please follow up.`);
          if (newStatus === "in_progress") await sendMetaTextMessage(empNorm, `⏳ In progress: "${tasks[0].title}"`);
        }
      } else {
        await sendMetaTextMessage(from, `✅ Response received. Thank you!`);
      }
    };

    // ── TYPE 1: Interactive Button Reply ────────────────────────────────────
    if (message.type === "interactive" && message.interactive?.type === "button_reply") {
      const payload = message.interactive.button_reply.id;
      const parts = payload.split("_");
      const btnStatus = parts[0];
      const shortId = parts[1];
      const newStatus =
        btnStatus === "DONE" ? "completed" : btnStatus === "PROGRESS" ? "in_progress" : "cannot_complete";
      await handleStatusUpdate(newStatus, shortId);
      return NextResponse.json({ status: "ok" });
    }

    // ── TYPE 2: Quick Reply Template Button Tap ─────────────────────────────
    if (message.type === "button") {
      const buttonText = message.button?.text?.toUpperCase() || "";
      const buttonPayload = message.button?.payload?.toUpperCase() || "";
      const combined = buttonPayload || buttonText;
      const newStatus = combined.includes("DONE")
        ? "completed"
        : combined.includes("PROGRESS")
        ? "in_progress"
        : "cannot_complete";
      await handleStatusUpdate(newStatus);
      return NextResponse.json({ status: "ok" });
    }

    const body = message.text?.body?.trim() || "";

    // ── TYPE 3: EMPLOYER sending task assignment command via WhatsApp ────────
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
              content: `You are a task extraction assistant. Extract task details. Return ONLY valid JSON:
{"title": "task description", "employee_name": "name or null", "deadline": "ISO string or null", "priority": "High or Medium or Low", "notes": "notes or null"}`,
            },
            { role: "user", content: body },
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
          await sendMetaTextMessage(
            empNorm,
            `Please mention a valid employee name.\n\nAvailable:\n${empList}\n\nExample: "Tell Rahul to clean office by 5pm"`
          );
          return NextResponse.json({ status: "ok" });
        }

        const { data: taskData, error } = await supabase
          .from("tasks")
          .insert([
            {
              title: parsed.title,
              assigned_to: employee.phone,
              status: "pending",
              notes: parsed.notes || null,
              deadline: parsed.deadline || null,
              priority: parsed.priority || "Medium",
              user_id: employee.user_id,
            },
          ])
          .select();

        if (error || !taskData) {
          await sendMetaTextMessage(empNorm, `⚠️ Error creating task: ${error?.message}`);
          return NextResponse.json({ status: "ok" });
        }

        const task = taskData[0];
        const shortId = task.id.split("-")[0].toUpperCase();
        const deadlineStr = parsed.deadline
          ? new Date(parsed.deadline).toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "No deadline";

        await sendTaskAssignmentWhatsApp({
          toPhone: employee.phone,
          shortId,
          taskTitle: parsed.title,
          priority: parsed.priority || "Medium",
          deadline: deadlineStr,
          notes: parsed.notes || undefined,
        });

        await sendMetaTextMessage(
          empNorm,
          `✅ Task assigned to ${employee.name}\nTask: ${parsed.title}\nID: ${shortId}\nDeadline: ${deadlineStr}`
        );
      } catch (err: any) {
        await sendMetaTextMessage(empNorm, `⚠️ Error processing voice/text task: ${err.message}`);
      }

      return NextResponse.json({ status: "ok" });
    }

    // ── TYPE 4: EMPLOYEE Text Reply Command ─────────────────────────────────
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
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ status: "error", error: err.message }, { status: 500 });
  }
}