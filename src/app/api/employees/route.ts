import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, employees: data });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { name, phone } = await request.json();
  const { data, error } = await supabase
    .from("employees")
    .insert([{ name, phone, user_id: user.id }])
    .select();

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, employee: data[0] });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { id } = await request.json();
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true });
}