"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Pencil, Trash2, Building2, Search, ArrowRight, Mail, Phone } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Client = {
  id: string; name: string; type: string;
  gstin: string | null; pan: string | null;
  email: string | null; phone: string | null;
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
  const [form, setForm] = useState({ name: "", type: "Company", gstin: "", pan: "", email: "", phone: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchClients(); }
    });
  }, []);

  async function fetchClients() {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
    setLoading(false);
  }

  async function saveClient() {
    if (!form.name.trim()) { showToast("Client name is required"); return; }
    if (editClient) {
      const { error } = await supabase.from("clients").update({ ...form }).eq("id", editClient.id);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Client updated");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("clients").insert([{ ...form, user_id: session?.user.id }]);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Client added");
    }
    setForm({ name: "", type: "Company", gstin: "", pan: "", email: "", phone: "" });
    setShowForm(false); setEditClient(null);
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
    setForm({ name: client.name, type: client.type || "Company", gstin: client.gstin || "", pan: client.pan || "", email: client.email || "", phone: client.phone || "" });
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
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>Clients</h1>
            <p style={{ fontSize: "14px", color: "#8B949E", margin: 0 }}>{clients.length} clients total</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditClient(null); setForm({ name: "", type: "Company", gstin: "", pan: "", email: "", phone: "" }); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500, boxShadow: "0 4px 12px rgba(46,134,193,0.25)" }}>
            <Plus size={15} /> Add Client
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 20px" }}>{editClient ? "Edit Client" : "New Client"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>CLIENT NAME *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. ABC Pvt Ltd" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>TYPE</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>GSTIN</label>
                <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>PAN</label>
                <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} placeholder="AAAAA0000A" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>EMAIL</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>PHONE</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveClient}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                {editClient ? "Update Client" : "Save Client"}
              </button>
              <button onClick={() => { setShowForm(false); setEditClient(null); }}
                style={{ padding: "10px 16px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6B7A8D" }} />
            <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "32px" }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ ...inputStyle, width: "160px", cursor: "pointer" }}>
            <option value="all">All Types</option>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: "13px", color: "#484F58", whiteSpace: "nowrap" }}>{filtered.length} clients</span>
        </div>

        {/* Client Cards */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {[1,2,3].map(i => <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", height: "160px", opacity: 0.4 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#484F58" }}>
            <Building2 size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: "16px", marginBottom: "6px" }}>No clients yet</div>
            <div style={{ fontSize: "13px", color: "#6B7A8D" }}>Add your first client to get started</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "14px" }}>
            {filtered.map(client => (
              <div key={client.id} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0F6FF", marginBottom: "6px" }}>{client.name}</div>
                    <span style={{ padding: "3px 10px", background: "rgba(88,166,255,0.12)", color: "#58A6FF", borderRadius: "20px", fontSize: "11px", border: "1px solid rgba(88,166,255,0.25)", fontWeight: 500 }}>
                      {client.type}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => startEdit(client)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "7px", cursor: "pointer" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteClient(client.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "7px", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                  {client.gstin && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>GST: <span style={{ color: "#C9D1D9", fontFamily: "monospace" }}>{client.gstin}</span></div>}
                  {client.pan && <div style={{ fontSize: "12px", color: "#6B7A8D" }}>PAN: <span style={{ color: "#C9D1D9", fontFamily: "monospace" }}>{client.pan}</span></div>}
                  {client.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6B7A8D" }}>
                      <Mail size={11} /><span style={{ color: "#C9D1D9" }}>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6B7A8D" }}>
                      <Phone size={11} /><span style={{ color: "#C9D1D9" }}>{client.phone}</span>
                    </div>
                  )}
                </div>

                <a href={`/clients/${client.id}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D", fontWeight: 500 }}>
                  View Tasks <ArrowRight size={12} />
                </a>
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
    </div>
  );
}