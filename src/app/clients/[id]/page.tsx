"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Client = {
  id: string; name: string; type: string;
  gstin: string | null; pan: string | null;
  email: string | null; phone: string | null;
};

type Task = {
  id: string; title: string; assigned_to: string;
  status: string; created_at: string;
  deadline: string | null; priority: string | null;
  category_name: string | null;
};

type Employee = { id: string; name: string; phone: string; };

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending:         { bg: "rgba(210,153,34,0.15)",  text: "#D29922", border: "rgba(210,153,34,0.3)" },
  completed:       { bg: "rgba(56,211,159,0.15)",  text: "#38D39F", border: "rgba(56,211,159,0.3)" },
  failed:          { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
  in_progress:     { bg: "rgba(88,166,255,0.15)",  text: "#58A6FF", border: "rgba(88,166,255,0.3)" },
  cannot_complete: { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
};

const priorityStyles: Record<string, { bg: string; text: string; border: string }> = {
  High:   { bg: "rgba(248,81,73,0.15)",  text: "#F85149", border: "rgba(248,81,73,0.3)" },
  Medium: { bg: "rgba(210,153,34,0.15)", text: "#D29922",  border: "rgba(210,153,34,0.3)" },
  Low:    { bg: "rgba(56,211,159,0.15)", text: "#38D39F",  border: "rgba(56,211,159,0.3)" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "completed") return false;
  return new Date(deadline) < new Date();
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchAll(session.user.id); }
    });
  }, [clientId]);

  async function fetchAll(userId: string) {
    setLoading(true);
    await Promise.all([fetchClient(), fetchTasks(userId), fetchEmployees(userId)]);
    setLoading(false);
  }

  async function fetchClient() {
    const { data } = await supabase.from("clients").select("*").eq("id", clientId).single();
    if (data) setClient(data);
  }

  async function fetchTasks(userId: string) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  }

  async function fetchEmployees(userId: string) {
    const { data } = await supabase.from("employees").select("*").eq("user_id", userId);
    if (data) setEmployees(data);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    showToast("Status updated");
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast("Task deleted");
  }

  function getEmpName(phone: string) {
    const e = employees.find(emp => emp.phone === phone || emp.phone === "+" + phone);
    return e ? e.name : phone;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const uniqueCategories = [...new Set(tasks.map(t => t.category_name).filter(Boolean))];

  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category_name !== filterCategory) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
  };

  const selectStyle = {
    padding: "8px 10px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
  };

  if (!user || loading) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  if (!client) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#F85149", fontFamily: "sans-serif" }}>Client not found</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>

      {/* Header */}
      <div style={{ background: "#161B22", borderBottom: "1px solid #21262D", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💬</div>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>TaskSend</span>
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>
            <a href="/clients" style={{ color: "#484F58", textDecoration: "none" }}>Clients</a>
            <span style={{ margin: "0 6px" }}>›</span>
            {client.name}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/clients" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>← Clients</a>
          <a href="/dashboard" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📊 Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Client Info Card */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{client.name}</h2>
              <span style={{ padding: "3px 10px", background: "rgba(88,166,255,0.15)", color: "#58A6FF", borderRadius: "20px", fontSize: "12px", border: "1px solid rgba(88,166,255,0.3)" }}>
                {client.type}
              </span>
            </div>
            <a href={`/?client=${client.id}`}
              style={{ padding: "9px 18px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}>
              + Assign Task
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginTop: "16px" }}>
            {client.gstin && (
              <div style={{ padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginBottom: "3px" }}>GSTIN</div>
                <div style={{ fontSize: "13px", color: "#C9D1D9" }}>{client.gstin}</div>
              </div>
            )}
            {client.pan && (
              <div style={{ padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginBottom: "3px" }}>PAN</div>
                <div style={{ fontSize: "13px", color: "#C9D1D9" }}>{client.pan}</div>
              </div>
            )}
            {client.email && (
              <div style={{ padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginBottom: "3px" }}>EMAIL</div>
                <div style={{ fontSize: "13px", color: "#C9D1D9" }}>{client.email}</div>
              </div>
            )}
            {client.phone && (
              <div style={{ padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginBottom: "3px" }}>PHONE</div>
                <div style={{ fontSize: "13px", color: "#C9D1D9" }}>{client.phone}</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "TOTAL", value: stats.total, color: "#58A6FF" },
            { label: "COMPLETED", value: stats.completed, color: "#38D39F" },
            { label: "PENDING", value: stats.pending, color: "#D29922" },
            { label: "OVERDUE", value: stats.overdue, color: "#F85149" },
          ].map(s => (
            <div key={s.label} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "10px", color: "#6B7A8D", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cannot_complete">Cannot Complete</option>
            <option value="failed">Failed</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selectStyle}>
            <option value="all">All Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c!}>{c}</option>)}
          </select>
          <span style={{ fontSize: "12px", color: "#484F58", marginLeft: "auto" }}>{filtered.length} tasks</span>
        </div>

        {/* Tasks */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>No tasks for this client yet.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map(task => {
              const empName = getEmpName(task.assigned_to);
              const sc = statusStyles[task.status] || statusStyles.pending;
              const pc = priorityStyles[task.priority || "Medium"] || priorityStyles.Medium;
              const overdue = isOverdue(task.deadline, task.status);

              return (
                <div key={task.id} style={{
                  background: "#161B22", borderRadius: "12px", padding: "14px",
                  border: overdue ? "1px solid rgba(248,81,73,0.4)" : "1px solid #21262D",
                  borderLeft: "3px solid #2E86C1",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ flex: 1, marginRight: "8px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#F0F6FF", marginBottom: "3px" }}>
                        {overdue && <span style={{ color: "#F85149", marginRight: "4px" }}>⚠️</span>}
                        {task.title}
                      </div>
                      {task.category_name && (
                        <span style={{ fontSize: "11px", color: "#58A6FF" }}>📂 {task.category_name}</span>
                      )}
                    </div>
                    <button onClick={() => deleteTask(task.id)}
                      style={{ padding: "4px 10px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                      Del
                    </button>
                  </div>

                  <div style={{ fontSize: "12px", color: "#6B7A8D", marginBottom: "10px" }}>
                    👤 {empName} · {formatDate(task.created_at)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                      {task.priority || "Medium"}
                    </span>
                    {task.deadline && (
                      <span style={{ fontSize: "11px", color: overdue ? "#F85149" : "#6B7A8D" }}>
                        📅 {formatDate(task.deadline)}
                      </span>
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                        style={{ padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1px solid ${sc.border}`, cursor: "pointer", background: sc.bg, color: sc.text, outline: "none" }}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cannot_complete">Cannot Complete</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#161B22", color: "#38D39F", padding: "12px 24px", borderRadius: "8px", fontSize: "13px", zIndex: 999, border: "1px solid rgba(56,211,159,0.3)", fontWeight: 500 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}