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
          name: "task_assigned_v2",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: shortId },
                { type: "text", text: taskTitle },
                { type: "text", text: priority },
                { type: "text", text: deadline }
              ]
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: "0",
              parameters: [{ type: "payload", payload: `DONE_${shortId}` }]
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: "1",
              parameters: [{ type: "payload", payload: `PROGRESS_${shortId}` }]
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: "2",
              parameters: [{ type: "payload", payload: `CANNOT_${shortId}` }]
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

  const { title, assigned_to, notes, deadline, priority, client_id, client_name, category_id, category_name, bulk } = await request.json();

  // For bulk tasks, only send WhatsApp — task already inserted by bulk page
  if (bulk) {
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString("en-IN") : "No deadline";
    await sendWhatsAppMessage(assigned_to.replace("+", ""), shortId, title, priority || "Medium", deadlineStr);
    return NextResponse.json({ success: true });
  }

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
      client_id: client_id || null,
      client_name: client_name || null,
      category_id: category_id || null,
      category_name: category_name || null,
    }])
    .select();

  if (error) return NextResponse.json({ success: false, error: error.message });

  const task = data[0];
  const shortId = task.id.split("-")[0].toUpperCase();
  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-IN")
    : "No deadline";

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