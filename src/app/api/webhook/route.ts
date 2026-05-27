import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// Service role client — bypasses RLS for server-side webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

  const entry = data?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) return NextResponse.json({ status: "ok" });

  const from = message.from;
  const phoneNumber = `+${from}`;
  const employerNumber = process.env.EMPLOYER_WHATSAPP!;

  // ── BUTTON REPLY from employee ───────────────────────────────────────────
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const buttonPayload = message.interactive.button_reply.id;
    const parts = buttonPayload.split("_");
    const status = parts[0];
    const shortId = parts[1];

    if (shortId) {
      // Match both +91... and 91... formats
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, assigned_to")
        .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
        .ilike("id", `${shortId.toLowerCase()}%`);

      if (tasks && tasks.length > 0) {
        const newStatus =
          status === "DONE" ? "completed" :
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

        if (newStatus === "cannot_complete") {
          await sendWhatsAppMessage(
            employerNumber,
            `⚠️ Employee could not complete task: "${tasks[0].title}". Please follow up.`
          );
        }
        if (newStatus === "completed") {
          await sendWhatsAppMessage(
            employerNumber,
            `✅ Task completed: "${tasks[0].title}"`
          );
        }
      } else {
        // Fallback — find latest pending task for this number
        const { data: fallbackTasks } = await supabase
          .from("tasks")
          .select("id, title")
          .or(`assigned_to.eq.${phoneNumber},assigned_to.eq.${from}`)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);

        if (fallbackTasks && fallbackTasks.length > 0) {
          const newStatus = status === "DONE" ? "completed" :
            status === "PROGRESS" ? "in_progress" : "cannot_complete";
          await supabase.from("tasks").update({ status: newStatus }).eq("id", fallbackTasks[0].id);
          await sendWhatsAppMessage(phoneNumber, `✅ Task "${fallbackTasks[0].title}" updated!`);
        } else {
          await sendWhatsAppMessage(phoneNumber, `✅ Response received. Thank you!`);
        }
      }
    }
    return NextResponse.json({ status: "ok" });
  }

  const body = message.text?.body?.trim() || "";

  // ── EMPLOYER → assign task via WhatsApp ─────────────────────────────────
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
{"title": "task description", "employee_name": "name of employee or null", "deadline": "ISO datetime string or null", "priority": "High or Medium or Low", "notes": "any additional notes or null"}
For deadlines, convert relative times like "today 5pm" or "tomorrow morning" into a full ISO datetime string.`
          },
          { role: "user", content: body }
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Find employer's user_id from employees table
      // We use employer's phone to find their account
      const { data: allEmployees } = await supabase
        .from("employees")
        .select("*");

      // Find employee by name
      let employee = null;
      if (parsed.employee_name && parsed.employee_name !== "null") {
        const matches = allEmployees?.filter((e: any) =>
          e.name.toLowerCase().includes(parsed.employee_name.toLowerCase())
        );
        if (matches && matches.length > 0) employee = matches[0];
      }

      if (!employee) {
        // Get list of available employees to show employer
        const empList = allEmployees?.map((e: any) => `• ${e.name}`).join("\n") || "No employees added yet";
        
        const errorMsg = parsed.employee_name && parsed.employee_name !== "null"
          ? `❌ Employee "${parsed.employee_name}" not found.\n\nAvailable team members:\n${empList}\n\nPlease mention the exact name in your message.\nExample: "Tell Sona to clean the office by 5pm"`
          : `Please mention the employee name in your message.\n\nAvailable team members:\n${empList}\n\nExample: "Tell Sona to clean the office by 5pm"`;

        await sendWhatsAppMessage(employerNumber, errorMsg);
        return NextResponse.json({ status: "ok" });
      }

      // Save task with user_id from employee record
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
        await sendWhatsAppMessage(employerNumber, `⚠️ Error saving task: ${error?.message}`);
        return NextResponse.json({ status: "ok" });
      }

      const task = taskData[0];
      const shortId = task.id.split("-")[0].toUpperCase();

      const pColors: Record<string, string> = {
        High: "🔴 High", Medium: "🟡 Medium", Low: "🟢 Low",
      };
      const priorityStr = pColors[parsed.priority] || "🟡 Medium";

      let deadlineStr = "No deadline";
      if (parsed.deadline) {
        deadlineStr = new Date(parsed.deadline).toLocaleDateString("en-IN", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit",
        });
      }

      // Send task to employee with buttons
      await sendWhatsAppMessage(
        employee.phone,
        `*New Task Assigned* 📋\n\nTask ID: ${shortId}\nTask: ${parsed.title}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}\n\nReply: DONE ${shortId} when completed.`
      );

      // Confirm to employer
      await sendWhatsAppMessage(
        employerNumber,
        `✅ Task assigned to ${employee.name}\n\nTask: ${parsed.title}\nID: ${shortId}\nPriority: ${priorityStr}\nDeadline: ${deadlineStr}\n\nView dashboard: https://whatsapp-task-system.vercel.app/dashboard`
      );

      return NextResponse.json({ status: "ok" });

    } catch (err: any) {
      await sendWhatsAppMessage(employerNumber, `⚠️ Error: ${err.message}`);
      return NextResponse.json({ status: "ok" });
    }
  }

  // ── EMPLOYEE → text reply to update status ──────────────────────────────
  const upperBody = body.toUpperCase();

  if (upperBody.startsWith("DONE")) {
    const parts = upperBody.split(" ");
    const shortId = parts[1];

    if (shortId) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("assigned_to", phoneNumber)
        .eq("status", "pending")
        .ilike("id", `${shortId.toLowerCase()}%`);

      if (tasks && tasks.length > 0) {
        await supabase.from("tasks").update({ status: "completed" }).eq("id", tasks[0].id);
        await sendWhatsAppMessage(phoneNumber, `✅ Task "${tasks[0].title}" marked as completed! Great work.`);
        await sendWhatsAppMessage(employerNumber, `✅ ${phoneNumber} completed task: "${tasks[0].title}"`);
        return NextResponse.json({ status: "ok" });
      }
    }

    // Fallback — mark latest pending task
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("assigned_to", phoneNumber)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (tasks && tasks.length > 0) {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", tasks[0].id);
      await sendWhatsAppMessage(phoneNumber, `✅ Task "${tasks[0].title}" marked as completed!`);
      await sendWhatsAppMessage(employerNumber, `✅ ${phoneNumber} completed task: "${tasks[0].title}"`);
    }

    return NextResponse.json({ status: "ok" });
  }

  // ── Default reply for unknown messages ───────────────────────────────────
  if (phoneNumber !== employerNumber) {
    await sendWhatsAppMessage(
      phoneNumber,
      `Reply *DONE <TaskID>* to mark a task complete.\nExample: DONE A1B2C3`
    );
  }

  return NextResponse.json({ status: "ok" });
}