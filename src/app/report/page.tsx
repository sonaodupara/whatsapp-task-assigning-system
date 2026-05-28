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
  client_id: string | null; client_name: string | null;
  category_id: string | null; category_name: string | null;
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
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const client = params.get("client");
    const category = params.get("category");

    let query = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    if (client && client !== "all") query = query.eq("client_id", client);
    if (category && category !== "all") query = query.eq("category_id", category);

    const { data } = await query;
    if (data) setTasks(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>Loading report...</div>
  );

  const statusColor: Record<string, string> = {
    completed: "#0a7c42",
    pending: "#b7800a",
    in_progress: "#1a5276",
    failed: "#c0392b",
    cannot_complete: "#c0392b",
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px", maxWidth: "100%", color: "#000", background: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#1A5276" }}>TaskSend — Task Report</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#555" }}>
            Generated: {new Date().toLocaleDateString("en-IN")} | Total: {tasks.length} tasks
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => window.print()}
            style={{ padding: "10px 20px", background: "#1A5276", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 600 }}>
            🖨️ Save as PDF
          </button>
          <button onClick={() => window.history.back()}
            style={{ padding: "10px 20px", background: "#f1f1f1", color: "#333", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 600 }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { label: "Total", value: tasks.length, color: "#1A5276" },
          { label: "Completed", value: tasks.filter(t => t.status === "completed").length, color: "#0a7c42" },
          { label: "Pending", value: tasks.filter(t => t.status === "pending").length, color: "#b7800a" },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "#2472a4" },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px", border: `2px solid ${s.color}`, borderRadius: "8px", textAlign: "center" as const }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#1A5276", color: "white" }}>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>#</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Task</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Client</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Category</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Assigned</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Status</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Priority</th>
            <th style={{ padding: "10px 8px", textAlign: "left" as const }}>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => (
            <tr key={t.id} style={{ background: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: "#888" }}>{i + 1}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", fontWeight: 500 }}>{t.title}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: "#555" }}>{t.client_name || "-"}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: "#555" }}>{t.category_name || "-"}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: "#555" }}>{t.assigned_to}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                <span style={{ padding: "2px 8px", borderRadius: "12px", background: `${statusColor[t.status] || "#888"}20`, color: statusColor[t.status] || "#888", fontWeight: 600, fontSize: "11px" }}>
                  {t.status}
                </span>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: t.priority === "High" ? "#c0392b" : t.priority === "Low" ? "#0a7c42" : "#b7800a", fontWeight: 500 }}>{t.priority || "Medium"}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee", color: "#555" }}>{formatDate(t.deadline)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`@media print { button { display: none !important; } }`}</style>
    </div>
  );
}