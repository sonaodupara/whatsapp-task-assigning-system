"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Task = {
  id: string; title: string; assigned_to: string;
  status: string; deadline: string | null;
  priority: string | null; client_name: string | null;
  category_name: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const statusColors: Record<string, string> = {
  pending: "#D29922",
  completed: "#38D39F",
  in_progress: "#58A6FF",
  failed: "#F85149",
  cannot_complete: "#F85149",
};

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchTasks(session.user.id); }
    });
  }, []);

  async function fetchTasks(userId: string) {
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).not("deadline", "is", null);
     if (data) setTasks(data as Task[]);
  }

  function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(month: number, year: number) {
    return new Date(year, month, 1).getDay();
  }

  function getTasksForDate(dateStr: string) {
  return tasks.filter(t => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    const taskDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return taskDate === dateStr;
  });
}

  function handleDateClick(dateStr: string) {
    const dayTasks = getTasksForDate(dateStr);
    setSelectedDate(dateStr);
    setSelectedTasks(dayTasks);
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const todayStr = today.toISOString().split("T")[0];

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#58A6FF" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px" }}>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>Task Calendar</h1>
          <p style={{ fontSize: "14px", color: "#8B949E", margin: 0 }}>Tasks by deadline date</p>
        </div>

        {/* Month Navigation */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button onClick={prevMonth}
              style={{ width: "36px", height: "36px", background: "#21262D", border: "1px solid #30363D", borderRadius: "8px", color: "#F0F6FF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={18} />
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth}
              style={{ width: "36px", height: "36px", background: "#21262D", border: "1px solid #30363D", borderRadius: "8px", color: "#F0F6FF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", color: "#6B7A8D", fontWeight: 600, padding: "6px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayTasks = getTasksForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasOverdue = dayTasks.some(t => t.status !== "completed" && new Date(dateStr) < today);

              return (
                <div key={idx} onClick={() => handleDateClick(dateStr)}
                  style={{
                    minHeight: "56px", padding: "6px 4px", borderRadius: "8px", cursor: "pointer",
                    background: isSelected ? "rgba(46,134,193,0.2)" : isToday ? "rgba(46,134,193,0.08)" : "#0D1117",
                    border: isSelected ? "1.5px solid #2E86C1" : isToday ? "1.5px solid rgba(46,134,193,0.4)" : "1px solid #21262D",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ fontSize: "13px", fontWeight: isToday ? 700 : 400, color: isToday ? "#2E86C1" : "#C9D1D9", textAlign: "center", marginBottom: "4px" }}>
                    {day}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {dayTasks.slice(0, 2).map(t => (
                      <div key={t.id} style={{ height: "5px", borderRadius: "3px", background: statusColors[t.status] || "#8B949E" }} />
                    ))}
                    {dayTasks.length > 2 && (
                      <div style={{ fontSize: "9px", color: "#6B7A8D", textAlign: "center" }}>+{dayTasks.length - 2}</div>
                    )}
                  </div>
                  {hasOverdue && dayTasks.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "2px" }}>
                      <AlertTriangle size={10} style={{ color: "#F85149" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", padding: "0 4px" }}>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#8B949E" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
              {status.replace("_", " ")}
            </div>
          ))}
        </div>

        {/* Selected Date Tasks */}
        {selectedDate && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 16px", color: "#8B949E" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h3>
            {selectedTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#484F58", fontSize: "14px" }}>
                No tasks due on this date
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedTasks.map(task => (
                  <div key={task.id} style={{ padding: "14px", background: "#0D1117", borderRadius: "10px", border: "1px solid #21262D", borderLeft: `3px solid ${statusColors[task.status] || "#8B949E"}` }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{task.title}</div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "12px", color: "#6B7A8D" }}>
                      {task.client_name && <span>🏢 {task.client_name}</span>}
                      {task.category_name && <span>📂 {task.category_name}</span>}
                      <span>👤 {task.assigned_to}</span>
                      <span style={{ color: statusColors[task.status] || "#8B949E", fontWeight: 600 }}>{task.status.replace("_", " ")}</span>
                      {task.priority && (
                        <span style={{ color: task.priority === "High" ? "#F85149" : task.priority === "Low" ? "#38D39F" : "#D29922", fontWeight: 600 }}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming tasks */}
        {!selectedDate && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#8B949E", margin: "0 0 14px", letterSpacing: "0.05em" }}>UPCOMING DEADLINES</h3>
            {tasks
              .filter(t => t.deadline && t.deadline >= todayStr && t.status !== "completed")
              .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
              .slice(0, 8)
              .map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                  <div style={{ width: "42px", textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#F0F6FF" }}>
                        {new Date(task.deadline!).getDate()}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7A8D" }}>
                        {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date(task.deadline!).getMonth()]}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#C9D1D9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                    <div style={{ fontSize: "11px", color: "#6B7A8D" }}>{task.client_name || task.category_name || task.assigned_to}</div>
                  </div>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusColors[task.status] || "#8B949E", flexShrink: 0 }} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}