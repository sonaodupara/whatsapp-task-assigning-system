"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Category = { id: string; name: string; color: string; frequency: string; team_id: string | null; team_name: string | null; };
type Client = { id: string; name: string; type: string; };
type Employee = { id: string; name: string; phone: string; team_id: string | null; };
type Team = { id: string; name: string; color: string; };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
    setSelectedClients(clients.map(c => c.id)); // select all clients by default
    setPreview([]);
    setGenerated(false);
  }

  function toggleClient(clientId: string) {
    setSelectedClients(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
    setPreview([]);
    setGenerated(false);
  }

  function toggleAllClients() {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
    setPreview([]);
    setGenerated(false);
  }

  function generatePreview() {
    if (!selectedCategory) { showToast("Select a category first", "error"); return; }
    if (selectedClients.length === 0) { showToast("Select at least one client", "error"); return; }

    // Get team members for this category
    const teamMembers = selectedCategory.team_id
      ? employees.filter(e => e.team_id === selectedCategory.team_id)
      : employees;

    if (teamMembers.length === 0) { showToast("No team members found for this category", "error"); return; }

    const selectedClientObjects = clients.filter(c => selectedClients.includes(c.id));
    const monthName = MONTHS[selectedMonth];

    // Divide clients equally among team members
    const assignments: any[] = [];
    selectedClientObjects.forEach((client, index) => {
      const employee = teamMembers[index % teamMembers.length];
      assignments.push({
        title: `${selectedCategory.name} - ${monthName} ${selectedYear} for ${client.name}`,
        client,
        employee,
        category: selectedCategory,
      });
    });

    setPreview(assignments);
  }

  async function createBulkTasks() {
    if (preview.length === 0) { showToast("Generate preview first", "error"); return; }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const tasks = preview.map(p => ({
        title: p.title,
        assigned_to: p.employee.phone,
        status: "pending",
        priority,
        deadline: deadline || null,
        user_id: session?.user.id,
        client_id: p.client.id,
        client_name: p.client.name,
        category_id: p.category.id,
        category_name: p.category.name,
      }));

      const { error } = await supabase.from("tasks").insert(tasks);

      if (error) {
        showToast("Error: " + error.message, "error");
        setLoading(false);
        return;
      }

      // Send WhatsApp notifications
      for (const p of preview) {
        await fetch("/api/create-task", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: p.title,
            assigned_to: p.employee.phone,
            priority,
            deadline: deadline || null,
            client_id: p.client.id,
            client_name: p.client.name,
            category_id: p.category.id,
            category_name: p.category.name,
            bulk: true, // flag to skip duplicate insert
          }),
        });
      }

      showToast(`✓ ${preview.length} tasks created and sent via WhatsApp!`, "success");
      setGenerated(true);
      setPreview([]);
      setSelectedCategory(null);
      setSelectedClients([]);
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }

    setLoading(false);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  const teamForCategory = selectedCategory?.team_id
    ? teams.find(t => t.id === selectedCategory.team_id)
    : null;

  const teamMembers = selectedCategory?.team_id
    ? employees.filter(e => e.team_id === selectedCategory.team_id)
    : [];

  const inputStyle = {
    padding: "9px 12px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#58A6FF", fontFamily: "sans-serif" }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", fontFamily: "'Segoe UI', sans-serif", color: "#F0F6FF" }}>

      {/* Header */}
      <div style={{ background: "#161B22", borderBottom: "1px solid #21262D", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💬</div>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>TaskSend</span>
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>Bulk Tasks</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>← Send</a>
          <a href="/dashboard" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📊 Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Bulk Task Creation</h2>
          <p style={{ fontSize: "13px", color: "#6B7A8D", margin: 0 }}>Create tasks for all clients in one click and auto-assign to team</p>
        </div>

        {/* Step 1 — Select Category */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", marginBottom: "12px", letterSpacing: "0.05em" }}>① SELECT SERVICE CATEGORY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => selectCategory(cat)}
                style={{
                  padding: "12px", borderRadius: "8px", cursor: "pointer", textAlign: "left" as const,
                  background: selectedCategory?.id === cat.id ? `${cat.color}25` : "#0D1117",
                  border: selectedCategory?.id === cat.id ? `1.5px solid ${cat.color}` : "1px solid #30363D",
                  color: "#F0F6FF",
                }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cat.color, marginBottom: "6px" }} />
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{cat.name}</div>
                <div style={{ fontSize: "11px", color: "#6B7A8D", marginTop: "2px" }}>{cat.team_name || "No team"}</div>
              </button>
            ))}
          </div>

          {selectedCategory && teamForCategory && (
            <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(46,134,193,0.1)", borderRadius: "8px", border: "1px solid rgba(46,134,193,0.2)", fontSize: "13px" }}>
              <span style={{ color: "#8B949E" }}>Team: </span>
              <span style={{ color: "#58A6FF", fontWeight: 500 }}>{teamForCategory.name}</span>
              <span style={{ color: "#484F58", marginLeft: "12px" }}>Members: </span>
              <span style={{ color: "#C9D1D9" }}>{teamMembers.map(e => e.name).join(", ")}</span>
            </div>
          )}
        </div>

        {/* Step 2 — Select Period */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", marginBottom: "12px", letterSpacing: "0.05em" }}>② SELECT PERIOD & SETTINGS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>MONTH</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ ...inputStyle, width: "100%" }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>YEAR</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...inputStyle, width: "100%" }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>PRIORITY</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>DEADLINE</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
            </div>
          </div>
        </div>

        {/* Step 3 — Select Clients */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", letterSpacing: "0.05em" }}>③ SELECT CLIENTS ({selectedClients.length}/{clients.length})</div>
            <button onClick={toggleAllClients}
              style={{ padding: "5px 12px", background: "#21262D", color: "#58A6FF", border: "1px solid #30363D", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
              {selectedClients.length === clients.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
            {clients.map(client => (
              <button key={client.id} onClick={() => toggleClient(client.id)}
                style={{
                  padding: "10px 12px", borderRadius: "8px", cursor: "pointer", textAlign: "left" as const,
                  background: selectedClients.includes(client.id) ? "rgba(46,134,193,0.15)" : "#0D1117",
                  border: selectedClients.includes(client.id) ? "1.5px solid #2E86C1" : "1px solid #30363D",
                  color: "#F0F6FF", display: "flex", alignItems: "center", gap: "8px",
                }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: selectedClients.includes(client.id) ? "#2E86C1" : "#21262D", border: "1px solid #30363D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "10px" }}>
                  {selectedClients.includes(client.id) ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{client.name}</div>
                  <div style={{ fontSize: "11px", color: "#6B7A8D" }}>{client.type}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Preview Button */}
        <button onClick={generatePreview} disabled={!selectedCategory || selectedClients.length === 0}
          style={{
            width: "100%", padding: "13px", marginBottom: "16px",
            background: selectedCategory && selectedClients.length > 0 ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D",
            color: selectedCategory && selectedClients.length > 0 ? "white" : "#484F58",
            border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600,
            cursor: selectedCategory && selectedClients.length > 0 ? "pointer" : "not-allowed",
          }}>
          👁 Preview Task Distribution
        </button>

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", marginBottom: "14px", letterSpacing: "0.05em" }}>
              PREVIEW — {preview.length} TASKS
            </div>

            {/* Group by employee */}
            {teamMembers.length > 0 && (
              <div style={{ marginBottom: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {teamMembers.map(emp => {
                  const count = preview.filter(p => p.employee.id === emp.id).length;
                  return (
                    <div key={emp.id} style={{ padding: "6px 12px", background: "rgba(46,134,193,0.1)", border: "1px solid rgba(46,134,193,0.2)", borderRadius: "20px", fontSize: "12px", color: "#58A6FF" }}>
                      {emp.name}: {count} clients
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
              {preview.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#0D1117", borderRadius: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#C9D1D9", flex: 1 }}>{p.client.name}</span>
                  <span style={{ color: "#484F58", margin: "0 8px" }}>→</span>
                  <span style={{ color: "#58A6FF", fontWeight: 500 }}>{p.employee.name}</span>
                </div>
              ))}
            </div>

            <button onClick={createBulkTasks} disabled={loading}
              style={{
                width: "100%", padding: "13px", marginTop: "14px",
                background: "linear-gradient(135deg, #238636, #2ea043)",
                color: "white", border: "none", borderRadius: "8px",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(46,160,67,0.3)",
              }}>
              {loading ? "Creating tasks..." : `🚀 Create ${preview.length} Tasks & Send WhatsApp`}
            </button>
          </div>
        )}

        {generated && (
          <div style={{ padding: "16px", background: "rgba(56,211,159,0.1)", border: "1px solid rgba(56,211,159,0.3)", borderRadius: "8px", textAlign: "center", fontSize: "14px", color: "#38D39F", fontWeight: 500 }}>
            ✅ Tasks created! <a href="/dashboard" style={{ color: "#58A6FF", marginLeft: "8px" }}>View in Dashboard →</a>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#161B22", color: toastType === "success" ? "#38D39F" : "#F85149",
          padding: "12px 24px", borderRadius: "8px", fontSize: "13px", zIndex: 999,
          border: `1px solid ${toastType === "success" ? "rgba(56,211,159,0.3)" : "rgba(248,81,73,0.3)"}`,
          fontWeight: 500,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}