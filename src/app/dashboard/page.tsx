'use client';

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart2, Users, Calendar, CheckCircle, AlertTriangle, Download, RefreshCw } from "lucide-react";

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
      else { 
        setUser(session.user); 
        fetchAll(session.user.id); 
      }
    });
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
    setToast("Dashboard refreshed");
    setTimeout(() => setToast(""), 2000);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setToast("Status updated");
    setTimeout(() => setToast(""), 1500);
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setToast("Task deleted");
    setTimeout(() => setToast(""), 1500);
  }

  function getEmpName(phone: string) {
    const e = employees.find(emp => emp.phone === phone || emp.phone === "+" + phone);
    return e ? e.name : phone;
  }

  function getCategoryColor(categoryId: string | null) {
    if (!categoryId) return "#2E86C1";
    return categories.find(c => c.id === categoryId)?.color || "#2E86C1";
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

  const filtered = tasks
    .filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterEmp !== "all" && t.assigned_to !== filterEmp) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterClient !== "all" && t.client_id !== filterClient) return false;
      if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.client_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority || "Medium"] ?? 1) - (PRIORITY_ORDER[b.priority || "Medium"] ?? 1));

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
  };

  const groups = (() => {
    if (groupBy === "none") return [{ label: null, tasks: filtered }];
    // ... (your original grouping logic)
    const grouped: Record<string, Task[]> = {};
    filtered.forEach(t => {
      let key = "Other";
      if (groupBy === "category") key = t.category_name || "No Category";
      if (groupBy === "client") key = t.client_name || "No Client";
      if (groupBy === "status") key = t.status;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    return Object.entries(grouped).map(([label, tasks]) => ({ label, tasks }));
  })();

  const inputStyle = {
    padding: "10px 12px",
    background: "#0D1117",
    border: "1px solid #30363D",
    borderRadius: "8px",
    color: "#F0F6FF",
    outline: "none",
    fontSize: "14px"
  };

  if (!user) return <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "32px 24px", maxWidth: "1280px", margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: "#8B949E" }}>Real-time overview of your operations</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {[
          { label: "TOTAL TASKS", value: stats.total, color: "#58A6FF", icon: BarChart2 },
          { label: "COMPLETED", value: stats.completed, color: "#38D39F", icon: CheckCircle },
          { label: "PENDING", value: stats.pending, color: "#D29922", icon: AlertTriangle },
          { label: "OVERDUE", value: stats.overdue, color: "#F85149", icon: AlertTriangle },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "#161B22",
            border: "1px solid #21262D",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <stat.icon size={32} style={{ color: stat.color }} />
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E" }}>{stat.label}</div>
            </div>
            <div style={{ fontSize: "48px", fontWeight: 700, marginTop: "16px" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: "#161B22",
        border: "1px solid #21262D",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, ...inputStyle }}
          />
          <button
            onClick={refreshTasks}
            style={{ padding: "10px 20px", background: "#21262D", border: "1px solid #30363D", borderRadius: "8px", color: "#58A6FF", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => exportCSV(filtered)} style={{ padding: "10px 20px", background: "#238636", color: "white", border: "none", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Download size={18} /> Export CSV
          </button>
        </div>

        {/* More filters can be added here as needed */}
      </div>

      {/* Tasks */}
      <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart2 size={22} /> All Tasks
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#8B949E" }}>Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#484F58" }}>No tasks found</div>
        ) : (
          groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: "32px" }}>
              {group.label && (
                <div style={{ fontSize: "15px", color: "#8B949E", marginBottom: "12px", fontWeight: 600 }}>
                  {group.label} ({group.tasks.length})
                </div>
              )}
              {group.tasks.map(task => {
                const empName = getEmpName(task.assigned_to);
                const col = getAvatarColor(empName);
                const sc = statusStyles[task.status] || statusStyles.pending;
                const pc = priorityStyles[task.priority || "Medium"];
                const overdue = isOverdue(task.deadline, task.status);
                const catColor = getCategoryColor(task.category_id);

                return (
                  <div key={task.id} style={{
                    background: "#0D1117",
                    border: `1px solid ${overdue ? "#F85149" : "#21262D"}`,
                    borderLeft: `4px solid ${catColor}`,
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>
                          {overdue && <AlertTriangle size={16} style={{ color: "#F85149", display: "inline", marginRight: "6px" }} />}
                          {task.title}
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "13px", color: "#8B949E" }}>
                          {task.client_name && <span>🏢 {task.client_name}</span>}
                          {task.category_name && <span>📂 {task.category_name}</span>}
                        </div>
                      </div>

                      <button onClick={() => deleteTask(task.id)} style={{ color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>

                    <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: col.bg, color: col.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>
                        {initials(empName)}
                      </div>
                      <div>
                        <div style={{ fontSize: "14px" }}>{empName}</div>
                        <div style={{ fontSize: "12px", color: "#6B7A8D" }}>{formatDate(task.created_at)}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "12px", background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                        {task.priority || "Medium"}
                      </span>
                      {task.deadline && (
                        <span style={{ fontSize: "13px", color: overdue ? "#F85149" : "#8B949E" }}>
                          📅 {formatDate(task.deadline)}
                        </span>
                      )}
                      <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)} style={{
                        marginLeft: "auto",
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`
                      }}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cannot_complete">Cannot Complete</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#161B22",
          color: "#38D39F",
          padding: "14px 24px",
          borderRadius: "10px",
          border: "1px solid rgba(56,211,159,0.4)",
          zIndex: 1000,
          fontWeight: 500
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}