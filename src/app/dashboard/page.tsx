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
  notes: string | null;
  deadline: string | null;
  priority: string | null;
};

type Employee = {
  id: string;
  name: string;
  phone: string;
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FAEEDA", text: "#854F0B", label: "Pending" },
  completed: { bg: "#E1F5EE", text: "#0F6E56", label: "Completed" },
  failed:    { bg: "#FCEBEB", text: "#A32D2D", label: "Failed" },
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  High:   { bg: "#FCEBEB", text: "#A32D2D" },
  Medium: { bg: "#FAEEDA", text: "#854F0B" },
  Low:    { bg: "#E1F5EE", text: "#0F6E56" },
};

const avatarColors = [
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#E1F5EE", text: "#0F6E56" },
  { bg: "#FAEEDA", text: "#854F0B" },
  { bg: "#EEEDFE", text: "#534AB7" },
  { bg: "#FAECE7", text: "#993C1D" },
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
    fetchAll();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchEmployees()]);
    setLoading(false);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  }

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("*");
    if (data) setEmployees(data);
  }

  async function refreshTasks() {
    setRefreshing(true);
    await fetchTasks();
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
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "Medium"] ?? 1;
      const pb = PRIORITY_ORDER[b.priority || "Medium"] ?? 1;
      return pa - pb;
    });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => isOverdue(t.deadline, t.status)).length,
  };

  const uniquePhones = [...new Set(tasks.map((t) => t.assigned_to))];

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1A5276", color: "white", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>📊</span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>Task Dashboard</div>
            <div style={{ fontSize: "12px", opacity: 0.75 }}>WhatsApp Task Manager</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a href="/" style={{ color: "white", fontSize: "13px", opacity: 0.85, textDecoration: "none" }}>← Back to Send</a>
          <button
            onClick={refreshTasks}
            style={{ padding: "7px 14px", background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
          >
            {refreshing ? "⟳ Refreshing..." : "⟳ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Total Tasks", value: stats.total, color: "#1A5276" },
            { label: "Completed", value: stats.completed, color: "#0F6E56" },
            { label: "Pending", value: stats.pending, color: "#854F0B" },
            { label: "Overdue", value: stats.overdue, color: "#A32D2D" },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", border: "1px solid #E8E8E8", borderRadius: "10px", padding: "16px 18px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "white", border: "1px solid #E8E8E8", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <input
            placeholder="🔍 Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px", border: "1px solid #DDD", borderRadius: "7px", minWidth: "180px" }}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px", border: "1px solid #DDD", borderRadius: "7px" }}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px", border: "1px solid #DDD", borderRadius: "7px" }}>
            <option value="all">All Employees</option>
            {uniquePhones.map((p) => (
              <option key={p} value={p}>{getEmpName(p)}</option>
            ))}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px", border: "1px solid #DDD", borderRadius: "7px" }}>
            <option value="all">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <span style={{ fontSize: "13px", color: "#888", marginLeft: "auto" }}>{filtered.length} tasks</span>
        </div>

        {/* Task Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>Loading tasks...</div>
        ) : (
          <div style={{ background: "white", border: "1px solid #E8E8E8", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 100px",
              padding: "12px 20px", background: "#F5F7FA",
              borderBottom: "1px solid #E8E8E8", fontSize: "12px", color: "#888", fontWeight: 600,
            }}>
              <div>TASK</div>
              <div>ASSIGNED TO</div>
              <div>STATUS</div>
              <div>PRIORITY</div>
              <div>DEADLINE</div>
              <div>ACTIONS</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px", color: "#AAA", fontSize: "14px" }}>No tasks found</div>
            ) : (
              filtered.map((task, idx) => {
                const empName = getEmpName(task.assigned_to);
                const col = getAvatarColor(empName);
                const sc = statusStyles[task.status] || { bg: "#EEE", text: "#666", label: task.status };
                const pc = priorityStyles[task.priority || "Medium"] || priorityStyles.Medium;
                const overdue = isOverdue(task.deadline, task.status);

                return (
                  <div
                    key={task.id}
                    style={{
                      display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 100px",
                      padding: "13px 20px",
                      borderBottom: idx < filtered.length - 1 ? "1px solid #F0F0F0" : "none",
                      alignItems: "center", fontSize: "13px",
                      background: overdue ? "#FFFBF5" : "white",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "#222", marginBottom: "2px" }}>{task.title}</div>
                      <div style={{ fontSize: "11px", color: "#AAA" }}>{formatDate(task.created_at)}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: col.bg, color: col.text,
                        fontSize: "11px", fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {initials(empName)}
                      </div>
                      <span style={{ color: "#444" }}>{empName}</span>
                    </div>

                    <div>
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        style={{
                          padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                          border: "none", cursor: "pointer",
                          background: sc.bg, color: sc.text,
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <div>
                      <span style={{
                        padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                        background: pc.bg, color: pc.text,
                      }}>
                        {task.priority || "Medium"}
                      </span>
                    </div>

                    <div style={{ color: overdue ? "#A32D2D" : "#555", fontSize: "12px" }}>
                      {overdue && <span style={{ marginRight: "4px" }}>⚠️</span>}
                      {formatDate(task.deadline)}
                    </div>

                    <div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{
                          padding: "5px 10px", background: "#FFF0F0", color: "#A32D2D",
                          border: "1px solid #F7C1C1", borderRadius: "6px",
                          fontSize: "12px", cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#1A5276", color: "white", padding: "12px 24px",
          borderRadius: "8px", fontSize: "14px", zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}