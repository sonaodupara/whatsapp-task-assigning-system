'use client';

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart2, CheckCircle, AlertTriangle, RefreshCw, Download, Search, Building2, FolderOpen } from "lucide-react";

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

  if (navigator.share) {
    navigator.share({ title: 'Tasks Export', text: csv });
  } else {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tasks.csv"; a.click();
  }
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
    await Promise.all([fetchTasks(userId), fetchEmployees(userId), fetchClients(), fetchCategories()]);
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

  function getGroups() {
    if (groupBy === "none") return [{ label: null, tasks: filtered }];
    if (groupBy === "category") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => { const key = t.category_name || "No Category"; if (!groups[key]) groups[key] = []; groups[key].push(t); });
      return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
    }
    if (groupBy === "client") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => { const key = t.client_name || "No Client"; if (!groups[key]) groups[key] = []; groups[key].push(t); });
      return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
    }
    if (groupBy === "status") {
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => { const key = t.status; if (!groups[key]) groups[key] = []; groups[key].push(t); });
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
    padding: "8px 12px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  const groups = getGroups();

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Total Tasks", value: stats.total, icon: BarChart2, color: "#58A6FF" },
            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "#38D39F" },
            { label: "Pending", value: stats.pending, icon: AlertTriangle, color: "#D29922" },
            { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "#F85149" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#8B949E", fontWeight: 500 }}>{s.label}</span>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: "36px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6B7A8D" }} />
              <input placeholder="Search tasks or clients..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...selectStyle, width: "100%", paddingLeft: "32px", boxSizing: "border-box" as const }} />
            </div>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
              <option value="none">No Grouping</option>
              <option value="category">Group by Category</option>
              <option value="client">Group by Client</option>
              <option value="status">Group by Status</option>
            </select>
            <button onClick={refreshTasks}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button onClick={() => exportCSV(filtered)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#238636", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px" }}>
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
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={selectStyle} title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={selectStyle} title="To date" />
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#484F58" }}>{filtered.length} tasks</div>
        </div>

        {/* Task Groups */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map(i => <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", height: "100px", opacity: 0.4 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#484F58" }}>
            <BarChart2 size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: "15px" }}>No tasks found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ height: "1px", flex: 1, background: "#21262D" }} />
                    <span>{group.label}</span>
                    <span style={{ fontSize: "11px", color: "#484F58", background: "#21262D", padding: "2px 8px", borderRadius: "10px" }}>{group.tasks.length}</span>
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
                        background: "#161B22", borderRadius: "12px", padding: "16px",
                        border: overdue ? "1px solid rgba(248,81,73,0.4)" : "1px solid #21262D",
                        borderLeft: `3px solid ${catColor}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div style={{ flex: 1, marginRight: "12px" }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#F0F6FF", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                              {overdue && <AlertTriangle size={14} style={{ color: "#F85149", flexShrink: 0 }} />}
                              {task.title}
                            </div>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              {task.client_name && (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#58A6FF" }}>
                                  <Building2 size={11} />{task.client_name}
                                </span>
                              )}
                              {task.category_name && (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: catColor }}>
                                  <FolderOpen size={11} />{task.category_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)}
                            style={{ padding: "5px 12px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Delete
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
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
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: overdue ? "#F85149" : "#6B7A8D" }}>
                              <CheckCircle size={11} />{formatDate(task.deadline)}
                            </span>
                          )}
                          <div style={{ marginLeft: "auto" }}>
                            <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                              style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1px solid ${sc.border}`, cursor: "pointer", background: sc.bg, color: sc.text, outline: "none" }}>
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
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#161B22", color: "#38D39F", padding: "12px 24px", borderRadius: "8px", fontSize: "13px", zIndex: 999, border: "1px solid rgba(56,211,159,0.3)", fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
          ✓ {toast}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}