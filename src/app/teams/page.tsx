"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Team = { id: string; name: string; color: string; };
type Employee = { id: string; name: string; phone: string; team_id: string | null; team_name: string | null; };
type Category = { id: string; name: string; color: string; team_id: string | null; team_name: string | null; };

const COLORS = [
  "#2E86C1", "#1A5276", "#0F6E56", "#854F0B",
  "#A32D2D", "#534AB7", "#993C1D", "#1A6B3C",
];

export default function TeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", color: "#2E86C1" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchAll(); }
    });
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchEmployees(), fetchCategories()]);
    setLoading(false);
  }

  async function fetchTeams() {
    const { data } = await supabase.from("teams").select("*").order("name");
    if (data) setTeams(data);
  }

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("*").order("name");
    if (data) setEmployees(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }

  async function saveTeam() {
    if (!form.name.trim()) { showToast("Team name is required"); return; }
    const { data: { session } } = await supabase.auth.getSession();

    if (editTeam) {
      await supabase.from("teams").update({ ...form }).eq("id", editTeam.id);
      showToast("Team updated");
    } else {
      await supabase.from("teams").insert([{ ...form, user_id: session?.user.id }]);
      showToast("Team added");
    }

    setForm({ name: "", color: "#2E86C1" });
    setShowForm(false);
    setEditTeam(null);
    fetchAll();
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete this team?")) return;
    // Unassign employees and categories from this team
    await supabase.from("employees").update({ team_id: null, team_name: null }).eq("team_id", id);
    await supabase.from("categories").update({ team_id: null, team_name: null }).eq("team_id", id);
    await supabase.from("teams").delete().eq("id", id);
    fetchAll();
    showToast("Team deleted");
  }

  async function assignEmployeeToTeam(employeeId: string, teamId: string, teamName: string) {
    await supabase.from("employees").update({ team_id: teamId || null, team_name: teamName || null }).eq("id", employeeId);
    fetchEmployees();
    showToast("Employee assigned");
  }

  async function assignCategoryToTeam(categoryId: string, teamId: string, teamName: string) {
    await supabase.from("categories").update({ team_id: teamId || null, team_name: teamName || null }).eq("id", categoryId);
    fetchCategories();
    showToast("Category assigned");
  }

  function startEdit(team: Team) {
    setEditTeam(team);
    setForm({ name: team.name, color: team.color });
    setShowForm(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", fontSize: "13px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "8px", color: "#F0F6FF", outline: "none",
    boxSizing: "border-box" as const,
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
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>Teams</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>← Send</a>
          <a href="/dashboard" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📊 Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Teams</h2>
            <p style={{ fontSize: "13px", color: "#6B7A8D", margin: 0 }}>Group employees by department</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditTeam(null); setForm({ name: "", color: "#2E86C1" }); }}
            style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
            + Add Team
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 16px" }}>{editTeam ? "Edit Team" : "New Team"}</h3>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>TEAM NAME *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. GST Team" style={inputStyle} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "8px" }}>COLOR</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid white" : "3px solid transparent", boxSizing: "border-box" }} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveTeam}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                {editTeam ? "Update" : "Save Team"}
              </button>
              <button onClick={() => { setShowForm(false); setEditTeam(null); }}
                style={{ padding: "10px 14px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Teams with members */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>Loading...</div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>👥</div>
            <div style={{ fontSize: "14px" }}>No teams yet. Add your first team.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {teams.map(team => {
              const teamEmployees = employees.filter(e => e.team_id === team.id);
              const teamCategories = categories.filter(c => c.team_id === team.id);

              return (
                <div key={team.id} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden" }}>
                  {/* Team header */}
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #21262D", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${team.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: team.color }} />
                      <span style={{ fontSize: "15px", fontWeight: 600 }}>{team.name}</span>
                      <span style={{ fontSize: "12px", color: "#484F58" }}>{teamEmployees.length} members</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => startEdit(team)}
                        style={{ padding: "5px 12px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => deleteTeam(team.id)}
                        style={{ padding: "5px 12px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Members */}
                    <div>
                      <div style={{ fontSize: "12px", color: "#8B949E", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>MEMBERS</div>
                      {teamEmployees.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#484F58" }}>No members assigned</div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {teamEmployees.map(emp => (
                            <span key={emp.id} style={{ padding: "4px 10px", background: `${team.color}25`, color: team.color, borderRadius: "20px", fontSize: "12px", border: `1px solid ${team.color}50` }}>
                              {emp.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    <div>
                      <div style={{ fontSize: "12px", color: "#8B949E", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>HANDLES</div>
                      {teamCategories.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#484F58" }}>No categories assigned</div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {teamCategories.map(cat => (
                            <span key={cat.id} style={{ padding: "4px 10px", background: `${cat.color}25`, color: cat.color, borderRadius: "20px", fontSize: "12px", border: `1px solid ${cat.color}50` }}>
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assign Employees to Teams */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginTop: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#8B949E", margin: "0 0 14px", letterSpacing: "0.05em" }}>ASSIGN EMPLOYEES TO TEAMS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {employees.map(emp => (
              <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#C9D1D9" }}>{emp.name}</span>
                <select
                  value={emp.team_id || ""}
                  onChange={e => {
                    const selected = teams.find(t => t.id === e.target.value);
                    assignEmployeeToTeam(emp.id, e.target.value, selected?.name || "");
                  }}
                  style={{ padding: "6px 10px", fontSize: "12px", background: "#161B22", border: "1px solid #30363D", borderRadius: "6px", color: "#F0F6FF", outline: "none", cursor: "pointer" }}
                >
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Assign Categories to Teams */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginTop: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#8B949E", margin: "0 0 14px", letterSpacing: "0.05em" }}>ASSIGN CATEGORIES TO TEAMS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#0D1117", borderRadius: "8px", border: "1px solid #21262D" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cat.color }} />
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#C9D1D9" }}>{cat.name}</span>
                </div>
                <select
                  value={cat.team_id || ""}
                  onChange={e => {
                    const selected = teams.find(t => t.id === e.target.value);
                    assignCategoryToTeam(cat.id, e.target.value, selected?.name || "");
                  }}
                  style={{ padding: "6px 10px", fontSize: "12px", background: "#161B22", border: "1px solid #30363D", borderRadius: "6px", color: "#F0F6FF", outline: "none", cursor: "pointer" }}
                >
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#161B22", color: "#38D39F", padding: "12px 24px", borderRadius: "8px", fontSize: "13px", zIndex: 999, border: "1px solid rgba(56,211,159,0.3)", fontWeight: 500 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}