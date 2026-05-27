"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Task = { id: string; title: string; assigned_to: string; status: string; created_at: string; notes: string | null; deadline: string | null; priority: string | null; };
type Employee = { id: string; name: string; phone: string; };

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: "rgba(210,153,34,0.15)",  text: "#D29922", border: "rgba(210,153,34,0.3)" },
  completed: { bg: "rgba(56,211,159,0.15)",  text: "#38D39F", border: "rgba(56,211,159,0.3)" },
  in_progress: { bg: "rgba(88,166,255,0.15)", text: "#58A6FF", border: "rgba(88,166,255,0.3)" },
  cannot_complete: { bg: "rgba(248,81,73,0.15)", text: "#F85149", border: "rgba(248,81,73,0.3)" },
  failed:    { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
};

const priorityStyles: Record<string, { bg: string; text: string; border: string }> = {
  High:   { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
  Medium: { bg: "rgba(210,153,34,0.15)",  text: "#D29922", border: "rgba(210,153,34,0.3)" },
  Low:    { bg: "rgba(56,211,159,0.15)",  text: "#38D39F", border: "rgba(56,211,159,0.3)" },
};

const avatarColors = [
  { bg: "rgba(88,166,255,0.2)", text: "#58A6FF" },
  { bg: "rgba(56,211,159,0.2)", text: "#38D39F" },
  { bg: "rgba(210,153,34,0.2)", text: "#D29922" },
  { bg: "rgba(188,140,255,0.2)", text: "#BC8CFF" },
  { bg: "rgba(248,81,73,0.2)", text: "#F85149" },
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "completed") return false;
  return new Date(deadline) < new Date();
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchAll(session.user.id); }
    });
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) fetchTasks(session.user.id);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll(userId: string) {
    setLoading(true);
    await Promise.all([fetchTasks(userId), fetchEmployees(userId)]);
    setLoading(false);
  }

  async function fetchTasks(userId: string) {
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setTasks(data);
  }

  async function fetchEmployees(userId: string) {
    const { data } = await supabase.from("employees").select("*").eq("user_id", userId).order("name");
    if (data) setEmployees(data);
  }

  async function refreshTasks() {
    setRefreshing(true);
    if (user) await fetchTasks(user.id);
    setRefreshing(false);
    showToast("Refreshed");
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    showToast("Status updated");
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("Task deleted");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function getEmpName(phone: string) {
    const e = employees.find((emp) => emp.phone === phone || emp.phone === "+" + phone);
    return e ? e.name : phone;
  }

  const filtered = tasks
    .filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterEmp !== "all" && t.assigned_to !== filterEmp) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority || "Medium"] ?? 1) - (PRIORITY_ORDER[b.priority || "Medium"] ?? 1));

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => isOverdue(t.deadline, t.status)).length,
  };

  const uniquePhones = [...new Set(tasks.map((t) => t.assigned_to))];
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  const selectStyle = {
    padding: "8px 10px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontSize: "14px", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>

      {/* Header */}
      <div style={{ background: "#161B22", borderBottom: "1px solid #21262D", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💬</div>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>TaskSend</span>
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a href="/" style={{ padding: "7px 14px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "13px", border: "1px solid #30363D" }}>← Send Task</a>
          <button onClick={refreshTasks} style={{ padding: "7px 12px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            {refreshing ? "..." : "⟳"}
          </button>
          <button onClick={signOut} style={{ padding: "7px 12px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "Total Tasks", value: stats.total, color: "#58A6FF" },
            { label: "Completed", value: stats.completed, color: "#38D39F" },
            { label: "Pending", value: stats.pending, color: "#D29922" },
            { label: "Overdue", value: stats.overdue, color: "#F85149" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ fontSize: "11px", color: "#6B7A8D", marginBottom: "6px", fontWeight: 600, letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
          <input
            placeholder="🔍 Search tasks..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", fontSize: "13px", background: "#0D1117", border: "1px solid #30363D", borderRadius: "8px", boxSizing: "border-box", marginBottom: "10px", color: "#F0F6FF", outline: "none" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} style={selectStyle}>
              <option value="all">All Employees</option>
              {uniquePhones.map((p) => <option key={p} value={p}>{getEmpName(p)}</option>)}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selectStyle}>
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "13px", color: "#484F58" }}>
              {filtered.length} tasks
            </div>
          </div>
        </div>

        {/* Task Cards */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "16px", height: "100px", opacity: 0.5 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#484F58" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>No tasks found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((task) => {
              const empName = getEmpName(task.assigned_to);
              const col = getAvatarColor(empName);
              const sc = statusStyles[task.status] || statusStyles.pending;
              const pc = priorityStyles[task.priority || "Medium"] || priorityStyles.Medium;
              const overdue = isOverdue(task.deadline, task.status);

              return (
                <div key={task.id} style={{
                  background: "#161B22", borderRadius: "12px", padding: "14px",
                  border: overdue ? "1px solid rgba(248,81,73,0.4)" : "1px solid #21262D",
                  borderLeft: overdue ? "3px solid #F85149" : "3px solid #2E86C1",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#F0F6FF", flex: 1, marginRight: "8px" }}>
                      {overdue && <span style={{ color: "#F85149", marginRight: "4px" }}>⚠️</span>}
                      {task.title}
                    </div>
                    <button onClick={() => deleteTask(task.id)}
                      style={{ padding: "4px 10px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Delete
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: col.bg, color: col.text, fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {initials(empName)}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#C9D1D9" }}>{empName}</div>
                      <div style={{ fontSize: "11px", color: "#484F58" }}>{formatDate(task.created_at)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                      {task.priority || "Medium"}
                    </span>
                    {task.deadline && (
                      <span style={{ fontSize: "12px", color: overdue ? "#F85149" : "#6B7A8D" }}>
                        📅 {formatDate(task.deadline)}
                      </span>
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}
                        style={{ padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1px solid ${sc.border}`, cursor: "pointer", background: sc.bg, color: sc.text, outline: "none" }}>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="cannot_complete">Cannot Complete</option>
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