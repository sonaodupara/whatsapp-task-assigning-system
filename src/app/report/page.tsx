"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Task = {
  id: string; title: string; assigned_to: string;
  status: string; created_at: string;
  deadline: string | null; priority: string | null;
  client_name: string | null; category_name: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReportPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else fetchTasks(session.user.id);
    });
  }, []);

  async function fetchTasks(userId: string) {
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>Loading...</div>
  );

  const statusColor: Record<string, string> = {
    completed: "#0a7c42", pending: "#b7800a",
    in_progress: "#1a5276", failed: "#c0392b", cannot_complete: "#c0392b",
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "16px", maxWidth: "600px", margin: "0 auto", color: "#000", background: "#fff", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", color: "#1A5276" }}>Task Report</h1>
        <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#777" }}>
          {new Date().toLocaleDateString("en-IN")} · {tasks.length} tasks
        </p>
        <button onClick={() => window.history.back()}
          style={{ padding: "10px 20px", background: "#f1f1f1", color: "#333", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 600 }}>
          ← Back
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
        {[
          { label: "Total", value: tasks.length, color: "#1A5276" },
          { label: "Completed", value: tasks.filter(t => t.status === "completed").length, color: "#0a7c42" },
          { label: "Pending", value: tasks.filter(t => t.status === "pending").length, color: "#b7800a" },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "#2472a4" },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px", border: `2px solid ${s.color}`, borderRadius: "8px", textAlign: "center" as const }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Task Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tasks.map((t, i) => (
          <div key={t.id} style={{ padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", borderLeft: `4px solid ${statusColor[t.status] || "#888"}` }}>
            <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{i + 1}. {t.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "12px", color: "#555" }}>
              {t.client_name && <span>🏢 {t.client_name}</span>}
              {t.category_name && <span>📂 {t.category_name}</span>}
              <span>👤 {t.assigned_to}</span>
              <span>📅 {formatDate(t.deadline)}</span>
              <span style={{ color: statusColor[t.status] || "#888", fontWeight: 600 }}>{t.status}</span>
              <span style={{ color: t.priority === "High" ? "#c0392b" : t.priority === "Low" ? "#0a7c42" : "#b7800a", fontWeight: 600 }}>{t.priority || "Medium"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}