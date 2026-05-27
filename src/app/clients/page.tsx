"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Client = {
  id: string;
  name: string;
  type: string;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

const CLIENT_TYPES = ["Company", "LLP", "Partnership", "Proprietorship", "Individual", "Trust", "Other"];

export default function ClientsPage() {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    name: "", type: "Company", gstin: "", pan: "", email: "", phone: ""
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchClients(); }
    });
  }, []);

  async function fetchClients() {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (data) setClients(data);
    setLoading(false);
  }

  async function saveClient() {
    if (!form.name.trim()) { showToast("Client name is required"); return; }

    if (editClient) {
      const { error } = await supabase
        .from("clients")
        .update({ ...form })
        .eq("id", editClient.id);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Client updated");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("clients")
        .insert([{ ...form, user_id: session?.user.id }]);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Client added");
    }

    setForm({ name: "", type: "Company", gstin: "", pan: "", email: "", phone: "" });
    setShowForm(false);
    setEditClient(null);
    fetchClients();
  }

  async function deleteClient(id: string) {
    if (!confirm("Delete this client?")) return;
    await supabase.from("clients").delete().eq("id", id);
    setClients(prev => prev.filter(c => c.id !== id));
    showToast("Client deleted");
  }

  function startEdit(client: Client) {
    setEditClient(client);
    setForm({
      name: client.name,
      type: client.type || "Company",
      gstin: client.gstin || "",
      pan: client.pan || "",
      email: client.email || "",
      phone: client.phone || "",
    });
    setShowForm(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const filtered = clients.filter(c => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          <span style={{ fontSize: "12px", color: "#484F58", paddingLeft: "8px", borderLeft: "1px solid #21262D" }}>Clients</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/" style={{ padding: "7px 14px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "13px", border: "1px solid #30363D" }}>← Send</a>
          <a href="/teams" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>👥 Teams</a>
          <a href="/dashboard" style={{ padding: "7px 14px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "13px", border: "1px solid #30363D" }}>📊 Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Title + Add button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Clients</h2>
            <p style={{ fontSize: "13px", color: "#6B7A8D", margin: 0 }}>{clients.length} clients total</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditClient(null); setForm({ name: "", type: "Company", gstin: "", pan: "", email: "", phone: "" }); }}
            style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}
          >
            + Add Client
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 16px", color: "#F0F6FF" }}>
              {editClient ? "Edit Client" : "New Client"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>CLIENT NAME *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. ABC Pvt Ltd" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>TYPE</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>GSTIN</label>
                <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>PAN</label>
                <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} placeholder="AAAAA0000A" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>EMAIL</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "5px" }}>PHONE</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveClient}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                {editClient ? "Update Client" : "Save Client"}
              </button>
              <button onClick={() => { setShowForm(false); setEditClient(null); }}
                style={{ padding: "10px 14px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "14px", marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="🔍 Search clients..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "200px", marginBottom: 0 }} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ ...inputStyle, width: "160px", marginBottom: 0, cursor: "pointer" }}>
            <option value="all">All Types</option>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: "13px", color: "#484F58", marginLeft: "auto" }}>{filtered.length} clients</span>
        </div>

        {/* Client Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>Loading clients...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#484F58" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
            <div style={{ fontSize: "14px" }}>No clients yet. Add your first client.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {filtered.map(client => (
              <div key={client.id} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0F6FF", marginBottom: "4px" }}>{client.name}</div>
                    <span style={{ padding: "2px 8px", background: "rgba(88,166,255,0.15)", color: "#58A6FF", borderRadius: "20px", fontSize: "11px", border: "1px solid rgba(88,166,255,0.3)" }}>
                      {client.type}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => startEdit(client)}
                      style={{ padding: "4px 10px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                      Edit
                    </button>
                    <button onClick={() => deleteClient(client.id)}
                      style={{ padding: "4px 10px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                      Del
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {client.gstin && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>GST: <span style={{ color: "#C9D1D9" }}>{client.gstin}</span></div>}
                  {client.pan && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>PAN: <span style={{ color: "#C9D1D9" }}>{client.pan}</span></div>}
                  {client.email && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>✉ <span style={{ color: "#C9D1D9" }}>{client.email}</span></div>}
                  {client.phone && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>📞 <span style={{ color: "#C9D1D9" }}>{client.phone}</span></div>}
                </div>

                <a href={`/dashboard?client=${client.id}`}
                  style={{ display: "block", marginTop: "12px", padding: "7px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", textAlign: "center", border: "1px solid #30363D" }}>
                  View Tasks →
                </a>
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