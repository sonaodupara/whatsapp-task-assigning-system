import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch all tasks ordered by created_at descending
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (tasksError) {
      return NextResponse.json({ success: false, error: tasksError.message });
    }

    // Fetch all employees to map names in memory (robust against missing foreign keys)
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("name, phone");

    if (employeesError) {
      // If employees fail, we still return tasks but without employee names mapped
      return NextResponse.json({ success: true, tasks });
    }

    // Map phone number to employee name
    const employeeMap = new Map(employees.map(emp => [emp.phone, emp.name]));

    const mappedTasks = tasks.map((task: any) => ({
      ...task,
      employee_name: employeeMap.get(task.assigned_to) || "Unknown Employee"
    }));

    return NextResponse.json({ success: true, tasks: mappedMapped(mappedTasks) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

// Quick helper to avoid naming mismatch
function mappedMapped(arr: any[]) {
  return arr;
}
