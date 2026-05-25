import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, employees: data });
}

export async function POST(request: Request) {
  const { name, phone } = await request.json();

  const { data, error } = await supabase
    .from("employees")
    .insert([{ name, phone }])
    .select();

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, employee: data[0] });
}
