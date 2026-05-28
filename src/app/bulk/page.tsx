"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Eye, Rocket, ChevronDown, CheckSquare, Square } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Category = { id: string; name: string; color: string; frequency: string; team_id: string | null; team_name: string | null; };
type Client = { id: string; name: string; type: string; };
type Employee = { id: string; name: string; phone: string; team_id: string | null; };
type Team = { id: string; name: string; color: string; };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BulkPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [priority, setPriority] = useState("High");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); setToken(session.access_token); fetchAll(); }
    });
  }, []);

  async function fetchAll() {
    const [catRes, clientRes, empRes, teamRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("employees").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (clientRes.data) setClients(clientRes.data);
    if (empRes.data) setEmployees(empRes.data);
    if (teamRes.data) setTeams(teamRes.data);
  }

  function selectCategory(cat: Category) {
    setSelectedCategory(cat);
    setSelectedClients(clients.map(c => c.id));
    setPreview([]);
    setGenerated(false);
  }

  function toggleClient(clientId: string) {
    setSelectedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
    setPreview([]);
    setGenerated(false);
  }

  function toggleAllClients() {
    setSelectedClients(selectedClients.length === clients.length ? [] : clients.map(c => c.id));
    setPreview([]);
    setGenerated(false);
  }

  function generatePreview() {
    if (!selectedCategory) { showToast("Select a category first", "error"); return; }
    if (selectedClients.length === 0) { showToast("Select at least one client", "error"); return; }
    const teamMembers = selectedCategory.team_id
      ? employees.filter(e => e.team_id === selectedCategory.team_id)
      : employees;
    if (teamMembers.length === 0) { showToast("No team members found for this category", "error"); return; }
    const selectedClientObjects = clients.filter(c => selectedClients.includes(c.id));
    const monthName = MONTHS[selectedMonth];
    const assignments: any[] = [];
    selectedClientObjects.forEach((client, index) => {
      const employee = teamMembers[index % teamMembers.length];
      assignments.push({ title: `${selectedCategory.name} - ${monthName} ${selectedYear} for ${client.name}`, client, employee, category: selectedCategory });
    });
    setPreview(assignments);
  }

  async function createBulkTasks() {
    if (preview.length === 0) { showToast("Generate preview first", "error"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tasks = preview.map(p => ({
        title: p.title, assigned_to: p.employee.phone, status: "pending", priority,
        deadline: deadline || null, user_id: session?.user.id,
        client_id: p.client.id, client_name: p.client.name,
        category_id: p.category.id, category_name: p.category.name,
      }));
      const { error } = await supabase.from("tasks").insert(tasks);
      if (error) { showToast("Error: " + error.message, "error"); setLoading(false); return; }
      for (const p of preview) {
        await fetch("/api/create-task", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: p.title, assigned_to: p.employee.phone, priority, deadline: deadline || null, client_id: p.client.id, client_name: p.client.name, category_id: p.category.id, category_name: p.category.name, bulk: true }),
        });
      }
      showToast(`${preview.length} tasks created and sent!`, "success");
      setGenerated(true); setPreview([]); setSelectedCategory(null); setSelectedClients([]);
    } catch (err: any) { showToast("Error: " + err.message, "error"); }
    setLoading(false);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  const teamForCategory = selectedCategory?.team_id ? teams.find(t => t.id === selectedCategory.team_id) : null;
  const teamMembers = selectedCategory?.team_id ? employees.filter(e => e.team_id === selectedCategory.team_id) : [];

  const selectStyle = {
    padding: "10px 12px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>Bulk Task Creation</h1>
          <p style={{ fontSize: "14px", color: "#8B949E", margin: 0 }}>Create tasks for all clients in one click and auto-assign to the right team</p>
        </div>

        {/* Step 1 — Category */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", marginBottom: "16px", letterSpacing: "0.08em" }}>SERVICE CATEGORY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => selectCategory(cat)}
                style={{
                  padding: "14px", borderRadius: "10px", cursor: "pointer", textAlign: "left" as const,
                  background: selectedCategory?.id === cat.id ? `${cat.color}20` : "#0D1117",
                  border: selectedCategory?.id === cat.id ? `2px solid ${cat.color}` : "1px solid #30363D",
                  color: "#F0F6FF", transition: "all 0.15s",
                }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color, marginBottom: "8px" }} />
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{cat.name}</div>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginTop: "3px" }}>{cat.team_name || "No team"}</div>
              </button>
            ))}
          </div>
          {selectedCategory && teamForCategory && (
            <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(46,134,193,0.08)", borderRadius: "8px", border: "1px solid rgba(46,134,193,0.2)", fontSize: "13px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span><span style={{ color: "#6B7A8D" }}>Team: </span><span style={{ color: "#58A6FF", fontWeight: 600 }}>{teamForCategory.name}</span></span>
              <span><span style={{ color: "#6B7A8D" }}>Members: </span><span style={{ color: "#C9D1D9" }}>{teamMembers.map(e => e.name).join(", ")}</span></span>
            </div>
          )}
        </div>

        {/* Step 2 — Period */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", marginBottom: "16px", letterSpacing: "0.08em" }}>PERIOD & SETTINGS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "6px", fontWeight: 500 }}>MONTH</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "6px", fontWeight: 500 }}>YEAR</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={selectStyle}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "6px", fontWeight: 500 }}>PRIORITY</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={selectStyle}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "6px", fontWeight: 500 }}>DEADLINE</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={selectStyle} />
            </div>
          </div>
        </div>

        {/* Step 3 — Clients */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", letterSpacing: "0.08em" }}>
              SELECT CLIENTS ({selectedClients.length}/{clients.length})
            </div>
            <button onClick={toggleAllClients}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#21262D", color: "#58A6FF", border: "1px solid #30363D", borderRadius: "7px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
              {selectedClients.length === clients.length ? <><CheckSquare size={13} /> Deselect All</> : <><Square size={13} /> Select All</>}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "8px" }}>
            {clients.map(client => {
              const selected = selectedClients.includes(client.id);
              return (
                <button key={client.id} onClick={() => toggleClient(client.id)}
                  style={{
                    padding: "12px 14px", borderRadius: "9px", cursor: "pointer", textAlign: "left" as const,
                    background: selected ? "rgba(46,134,193,0.12)" : "#0D1117",
                    border: selected ? "1.5px solid #2E86C1" : "1px solid #30363D",
                    color: "#F0F6FF", display: "flex", alignItems: "center", gap: "10px",
                  }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: selected ? "#2E86C1" : "transparent", border: selected ? "none" : "1.5px solid #484F58", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: "11px", fontWeight: 700 }}>
                    {selected ? "✓" : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{client.name}</div>
                    <div style={{ fontSize: "11px", color: "#6B7A8D" }}>{client.type}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview Button */}
        <button onClick={generatePreview} disabled={!selectedCategory || selectedClients.length === 0}
          style={{
            width: "100%", padding: "14px", marginBottom: "20px",
            background: selectedCategory && selectedClients.length > 0 ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D",
            color: selectedCategory && selectedClients.length > 0 ? "white" : "#484F58",
            border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
            cursor: selectedCategory && selectedClients.length > 0 ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            boxShadow: selectedCategory && selectedClients.length > 0 ? "0 4px 16px rgba(46,134,193,0.25)" : "none",
          }}>
          <Eye size={18} /> Preview Task Distribution
        </button>

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", marginBottom: "16px", letterSpacing: "0.08em" }}>
              PREVIEW — {preview.length} TASKS
            </div>
            {teamMembers.length > 0 && (
              <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {teamMembers.map(emp => {
                  const count = preview.filter(p => p.employee.id === emp.id).length;
                  return (
                    <div key={emp.id} style={{ padding: "6px 14px", background: "rgba(46,134,193,0.1)", border: "1px solid rgba(46,134,193,0.25)", borderRadius: "20px", fontSize: "12px", color: "#58A6FF", fontWeight: 500 }}>
                      {emp.name} — {count} clients
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto", marginBottom: "16px" }}>
              {preview.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "#0D1117", borderRadius: "8px", fontSize: "13px", border: "1px solid #21262D" }}>
                  <span style={{ color: "#C9D1D9", flex: 1, fontWeight: 500 }}>{p.client.name}</span>
                  <span style={{ color: "#30363D", margin: "0 12px", fontSize: "16px" }}>→</span>
                  <span style={{ color: "#58A6FF", fontWeight: 600 }}>{p.employee.name}</span>
                </div>
              ))}
            </div>
            <button onClick={createBulkTasks} disabled={loading}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #1a6b3c, #238636)",
                color: "white", border: "none", borderRadius: "10px",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                boxShadow: "0 4px 16px rgba(35,134,54,0.3)",
              }}>
              <Rocket size={18} />
              {loading ? "Creating tasks..." : `Create ${preview.length} Tasks & Send WhatsApp`}
            </button>
          </div>
        )}

        {generated && (
          <div style={{ padding: "18px 20px", background: "rgba(56,211,159,0.08)", border: "1px solid rgba(56,211,159,0.3)", borderRadius: "10px", textAlign: "center", fontSize: "14px", color: "#38D39F", fontWeight: 500 }}>
            Tasks created successfully!{" "}
            <a href="/dashboard" style={{ color: "#58A6FF", marginLeft: "8px", textDecoration: "underline" }}>View in Dashboard →</a>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#161B22", color: toastType === "success" ? "#38D39F" : "#F85149",
          padding: "12px 24px", borderRadius: "8px", fontSize: "13px", zIndex: 999,
          border: `1px solid ${toastType === "success" ? "rgba(56,211,159,0.3)" : "rgba(248,81,73,0.3)"}`,
          fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}