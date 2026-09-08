import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    // If auth header is provided, use authenticated Supabase client
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch tasks for current authenticated user ordered by created_at descending
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (tasksError) {
      return NextResponse.json({ success: false, error: tasksError.message }, { status: 500 });
    }

    // Fetch user's employees to map names in memory
    const { data: employees } = await supabase
      .from("employees")
      .select("name, phone")
      .eq("user_id", user.id);

    const employeeMap = new Map((employees || []).map((emp) => [emp.phone, emp.name]));

    const mappedTasks = (tasks || []).map((task: any) => ({
      ...task,
      employee_name: employeeMap.get(task.assigned_to) || task.assigned_to || "Unassigned",
    }));

    return NextResponse.json({ success: true, tasks: mappedTasks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
