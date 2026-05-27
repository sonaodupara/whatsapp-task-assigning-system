import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function sendWhatsAppMessage(to: string, shortId: string, taskTitle: string, priority: string, deadline: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID!;
  const token = process.env.META_WHATSAPP_TOKEN!;

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: "task_assigned",
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: shortId },
                { type: "text", text: taskTitle },
                { type: "text", text: priority },
                { type: "text", text: deadline }
              ]
            }
          ]
        }
      }),
    }
  );
  return response.json();
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { title, assigned_to, notes, deadline, priority } = await request.json();

  const { data, error } = await supabase
    .from("tasks")
    .insert([{
      title,
      assigned_to,
      notes: notes || null,
      deadline: deadline || null,
      priority: priority || "Medium",
      status: "pending",
      user_id: user.id,
    }])
    .select();

  if (error) return NextResponse.json({ success: false, error: error.message });

  const task = data[0];
  const shortId = task.id.split("-")[0].toUpperCase();
  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-IN")
    : "No deadline";
  console.log("SENDING TO META:", { to: assigned_to.replace("+", ""), shortId, title: task.title, priority: task.priority, deadline: deadlineStr });
  const waResult = await sendWhatsAppMessage(
    assigned_to.replace("+", ""),
    shortId,
    task.title,
    task.priority || "Medium",
    deadlineStr
  );

  console.log("META RESPONSE:", JSON.stringify(waResult));

  if (waResult.error) return NextResponse.json({ success: false, metaError: waResult.error });

  return NextResponse.json({ success: true, task });
}