import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTaskAssignmentWhatsApp, formatMetaPhoneNumber } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, assigned_to, notes, deadline, priority, client_id, client_name, category_id, category_name, bulk } = body;

  if (!title || !assigned_to) {
    return NextResponse.json({ success: false, error: "Title and assigned_to (employee phone) are required" }, { status: 400 });
  }

  // Format phone number to clean E.164 string with country code (e.g. +917025423667)
  const rawDigits = assigned_to.replace(/\D/g, "");
  const formattedPhone = rawDigits.length === 10 ? `+91${rawDigits}` : `+${rawDigits}`;

  // Handle bulk task notification
  if (bulk) {
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString("en-IN") : "No deadline";

    const waResult = await sendTaskAssignmentWhatsApp({
      toPhone: formattedPhone,
      shortId,
      taskTitle: title,
      priority: priority || "Medium",
      deadline: deadlineStr,
      notes: notes || undefined,
    });

    return NextResponse.json({ success: waResult.success, method: waResult.method, metaResponse: waResult.data });
  }

  // Insert standard task into Supabase
  const { data, error } = await supabase
    .from("tasks")
    .insert([{
      title,
      assigned_to: formattedPhone,
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

  if (error || !data || data.length === 0) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to create task" }, { status: 500 });
  }

  const task = data[0];
  const shortId = task.id.split("-")[0].toUpperCase();
  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "No deadline";

  // Dispatch WhatsApp notification
  const waResult = await sendTaskAssignmentWhatsApp({
    toPhone: formattedPhone,
    shortId,
    taskTitle: task.title,
    priority: task.priority || "Medium",
    deadline: deadlineStr,
    notes: task.notes || undefined,
  });

  return NextResponse.json({
    success: true,
    task,
    whatsappSent: waResult.success,
    deliveryMethod: waResult.method,
    metaResponse: waResult.data,
  });
}