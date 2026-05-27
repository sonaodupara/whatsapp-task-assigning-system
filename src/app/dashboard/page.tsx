"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Task = {
  id: string;
  title: string;
  assigned_to: string;
  status: string;
  created_at: string;
  deadline: string | null;
  priority: string | null;
  client_id: string | null;
  client_name: string | null;
  category_id: string | null;
  category_name: string | null;
};

type Employee = { id: string; name: string; phone: string; };
type Client = { id: string; name: string; };
type Category = { id: string; name: string; color: string; };

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending:          { bg: "rgba(210,153,34,0.15)",  text: "#D29922", border: "rgba(210,153,34,0.3)" },
  completed:        { bg: "rgba(56,211,159,0.15)",  text: "#38D39F", border: "rgba(56,211,159,0.3)" },
  failed:           { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
  in_progress:      { bg: "rgba(88,166,255,0.15)",  text: "#58A6FF", border: "rgba(88,166,255,0.3)" },
  cannot_complete:  { bg: "rgba(248,81,73,0.15)",   text: "#F85149", border: "rgba(248,81,73,0.3)" },
};

const priorityStyles: Record<string, { bg: string; text: string; border: string }> = {
  High:   { bg: "rgba(248,81,73,0.15)",  text: "#F85149", border: "rgba(248,81,73,0.3)" },
  Medium: { bg: "rgba(210,153,34,0.15)", text: "#D29922",  border: "rgba(210,153,34,0.3)" },
  Low:    { bg: "rgba(56,211,159,0.15)", text: "#38D39F",  border: "rgba(56,211,159,0.3)" },
};

const avatarColors = [
  { bg: "rgba(88,166,255,0.2)",  text: "#58A6FF" },
  { bg: "rgba(56,211,159,0.2)",  text: "#38D39F" },
  { bg: "rgba(210,153,34,0.2)",  text: "#D29922" },
  { bg: "rgba(188,140,255,0.2)", text: "#BC8CFF" },
  { bg: "rgba(248,81,73,0.2)",   text: "#F85149" },
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "completed") return false;
  return new Date(deadline) < new Date();
}

function exportCSV(tasks: Task[]) {
  const headers = ["Title", "Client", "Category", "Assigned To", "Status", "Priority", "Deadline", "Created"];
  const rows = tasks.map(t => [
    `"${t.title}"`,
    `"${t.client_name || ""}"`,
    `"${t.category_name || ""}"`,
    `"${t.assigned_to}"`,
    t.status,
    t.priority || "Medium",
    t.deadline ? formatDate(t.deadline) : "",
    formatDate(t.created_at),
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tasks.csv"; a.click();
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [groupBy, setGroupBy] = useState("none");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchAll(session.user.id); }
    });

    // Read URL params for pre-filtering
    const params = new URLSearchParams(window.location.search);
    if (params.get("client")) setFilterClient(params.get("client")!);
    if (params.get("category")) setFilterCategory(params.get("category")!);

    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) fetchTasks(session.user.id);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll(userId: string) {
    setLoading(true);
    await Promise.all([
      fetchTasks(userId),
      fetchEmployees(userId),
      fetchClients(),
      fetchCategories(),
    ]);
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

  async function fetchClients() {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    if (data) setClients(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("id, name, color").order("name");
    if (data) setCategories(data);
  }

  async function refreshTasks() {
    setRefreshing(true);
    if (user) await fetchTasks(user.id);
    setRefreshing(false);
    showToast("Refreshed");
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function getEmpName(phone: string) {
    const e = employees.find(emp => emp.phone === phone || emp.phone === "+" + phone);
    return e ? e.name : phone;
  }

  function getCategoryColor(categoryId: string | null) {
    if (!categoryId) return "#2E86C1";
    return categories.find(c => c.id === categoryId)?.color || "#2E86C1";
  }

  const filtered = tasks
    .filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterEmp !== "all" && t.assigned_to !== filterEmp) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterClient !== "all" && t.client_id !== filterClient) return false;
      if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.client_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority || "Medium"] ?? 1) - (PRIORITY_ORDER[b.priority || "Medium"] ?? 1));

  // Group tasks
  function getGroups() {
    if (groupBy === "none") return [{ label: null, tasks: filtered }];
    if (groupBy === "category") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => {
        const key = t.category_name || "No Category";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
    }
    if (groupBy === "client") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => {
        const key = t.client_name || "No Client";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
    }
    if (groupBy === "status") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => {
        const key = t.status;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
    }
    return [{ label: null, tasks: filtered }];
  }

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

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  const groups = getGroups();

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>

      {/* Header */}
      <div style={{ background: "#161B22", borderBottom: "1px solid #21262D", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💬</div>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>TaskSend</span>
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <a href="/" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>← Send</a>
          <a href="/teams" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>👥 Teams</a>
          <a href="/clients" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>🏢 Clients</a>
          <a href="/categories" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📂 Categories</a>
          <button onClick={refreshTasks} style={{ padding: "7px 12px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            {refreshing ? "..." : "⟳"}
          </button>
          <button onClick={signOut} style={{ padding: "7px 12px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "1100px", margin: "0 auto" }}>

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
              <div style={{ fontSize: "26px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <input placeholder="🔍 Search tasks or clients..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...selectStyle, flex: 1, minWidth: "160px" }} />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
              <option value="none">No Grouping</option>
              <option value="category">Group by Category</option>
              <option value="client">Group by Client</option>
              <option value="status">Group by Status</option>
            </select>
            <button onClick={() => exportCSV(filtered)}
              style={{ padding: "8px 14px", background: "#238636", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
              ⬇ Export CSV
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cannot_complete">Cannot Complete</option>
              <option value="failed">Failed</option>
            </select>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
              <option value="all">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selectStyle}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={selectStyle}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.phone}>{e.name}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selectStyle}>
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              placeholder="From date" style={selectStyle} title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              placeholder="To date" style={selectStyle} title="To date" />
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#484F58" }}>{filtered.length} tasks</div>
        </div>

        {/* Task Groups */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map(i => <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", height: "100px", opacity: 0.4 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>No tasks found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ height: "1px", flex: 1, background: "#21262D" }} />
                    {group.label}
                    <span style={{ fontSize: "11px", color: "#484F58" }}>({group.tasks.length})</span>
                    <div style={{ height: "1px", flex: 1, background: "#21262D" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {group.tasks.map(task => {
                    const empName = getEmpName(task.assigned_to);
                    const col = getAvatarColor(empName);
                    const sc = statusStyles[task.status] || statusStyles.pending;
                    const pc = priorityStyles[task.priority || "Medium"] || priorityStyles.Medium;
                    const overdue = isOverdue(task.deadline, task.status);
                    const catColor = getCategoryColor(task.category_id);

                    return (
                      <div key={task.id} style={{
                        background: "#161B22", borderRadius: "12px", padding: "14px",
                        border: overdue ? "1px solid rgba(248,81,73,0.4)" : "1px solid #21262D",
                        borderLeft: `3px solid ${catColor}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ flex: 1, marginRight: "8px" }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#F0F6FF", marginBottom: "3px" }}>
                              {overdue && <span style={{ color: "#F85149", marginRight: "4px" }}>⚠️</span>}
                              {task.title}
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {task.client_name && (
                                <span style={{ fontSize: "11px", color: "#58A6FF" }}>🏢 {task.client_name}</span>
                              )}
                              {task.category_name && (
                                <span style={{ fontSize: "11px", color: catColor }}>📂 {task.category_name}</span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)}
                            style={{ padding: "4px 10px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Del
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: col.bg, color: col.text, fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
              </div>
            ))}
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