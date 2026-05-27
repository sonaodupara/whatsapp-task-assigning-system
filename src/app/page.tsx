"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Employee = { id: string; name: string; phone: string; };
type Client = { id: string; name: string; type: string; };
type Category = { id: string; name: string; color: string; frequency: string; };

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const tokenRef = useRef<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else {
        setUser(session.user);
        tokenRef.current = session.access_token;
        fetchAll(session.access_token);
      }
    });

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const r = new SR();
      r.continuous = false; r.interimResults = true; r.lang = "en-IN";
      r.onresult = (e: any) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setAiMessage(t); };
      r.onend = () => setIsListening(false);
      r.onerror = () => setIsListening(false);
      recognitionRef.current = r;
    }
  }, []);

  async function fetchAll(token: string) {
    const [empRes, clientRes, catRes] = await Promise.all([
      fetch("/api/employees", { headers: { Authorization: `Bearer ${token}` } }),
      supabase.from("clients").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    const empData = await empRes.json();
    if (empData.success) setEmployees(empData.employees);
    if (clientRes.data) setClients(clientRes.data);
    if (catRes.data) setCategories(catRes.data);
  }

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { setAiMessage(""); recognitionRef.current.start(); setIsListening(true); }
  };

  const addEmployee = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ name: newName, phone: newPhone }),
    });
    const data = await res.json();
    if (data.success) {
      setNewName(""); setNewPhone(""); setShowAddEmployee(false);
      fetchAll(tokenRef.current);
    }
  };

  const parseWithAI = async () => {
    setLoading(true);
    const res = await fetch("/api/parse-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: aiMessage }),
    });
    const data = await res.json();
    if (data.success) {
      setTitle(data.task.title);
      const match = employees.find(e => aiMessage.toLowerCase().includes(e.name.toLowerCase()));
      if (match) setSelectedEmployee(match);
      setMessage("AI parsed. Review and send."); setMessageType("success");
    } else {
      setMessage("Could not parse. Fill manually."); setMessageType("error");
    }
    setLoading(false);
  };

  const sendTask = async () => {
    if (!selectedEmployee) { setMessage("Please select an employee."); setMessageType("error"); return; }
    if (!title.trim()) { setMessage("Please enter a task title."); setMessageType("error"); return; }
    setLoading(true);

    const clientName = clients.find(c => c.id === selectedClient)?.name || null;
    const categoryName = categories.find(c => c.id === selectedCategory)?.name || null;

    const res = await fetch("/api/create-task", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({
        title,
        assigned_to: selectedEmployee.phone,
        priority,
        deadline: deadline || null,
        client_id: selectedClient || null,
        client_name: clientName,
        category_id: selectedCategory || null,
        category_name: categoryName,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`✓ Task sent to ${selectedEmployee.name}`); setMessageType("success");
      setTitle(""); setSelectedEmployee(null); setAiMessage("");
      setSelectedClient(""); setSelectedCategory(""); setDeadline(""); setPriority("Medium");
    } else {
      setMessage("Error: " + data.error); setMessageType("error");
    }
    setLoading(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <a href="/dashboard" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📊 Dashboard</a>
          <a href="/clients" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>🏢 Clients</a>
          <a href="/categories" style={{ padding: "7px 12px", background: "#21262D", color: "#58A6FF", borderRadius: "8px", textDecoration: "none", fontSize: "12px", border: "1px solid #30363D" }}>📂 Categories</a>
          <button onClick={signOut} style={{ padding: "7px 12px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Send Task</h2>
          <p style={{ fontSize: "13px", color: "#6B7A8D", margin: 0 }}>Assign tasks to your team via WhatsApp</p>
        </div>

        {/* Team Members */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", letterSpacing: "0.05em" }}>TEAM MEMBERS</span>
            <button onClick={() => setShowAddEmployee(!showAddEmployee)}
              style={{ padding: "6px 12px", background: "#21262D", color: "#58A6FF", border: "1px solid #30363D", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
              + Add
            </button>
          </div>

          {showAddEmployee && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
              <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", fontSize: "13px", background: "#0D1117", border: "1px solid #30363D", borderRadius: "8px", color: "#F0F6FF", minWidth: "100px", outline: "none" }} />
              <input placeholder="+91..." value={newPhone} onChange={e => setNewPhone(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", fontSize: "13px", background: "#0D1117", border: "1px solid #30363D", borderRadius: "8px", color: "#F0F6FF", minWidth: "100px", outline: "none" }} />
              <button onClick={addEmployee}
                style={{ padding: "9px 16px", background: "#238636", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                Save
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {employees.length === 0 && <p style={{ color: "#484F58", fontSize: "13px", margin: 0 }}>No team members yet.</p>}
            {employees.map(emp => (
              <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
                style={{
                  padding: "8px 16px", borderRadius: "20px", fontSize: "13px", cursor: "pointer", fontWeight: 500,
                  background: selectedEmployee?.id === emp.id ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D",
                  color: selectedEmployee?.id === emp.id ? "white" : "#8B949E",
                  border: selectedEmployee?.id === emp.id ? "1px solid #2E86C1" : "1px solid #30363D",
                }}>
                {emp.name}
              </button>
            ))}
          </div>
          {selectedEmployee && (
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(46,134,193,0.1)", borderRadius: "8px", fontSize: "12px", color: "#58A6FF", border: "1px solid rgba(46,134,193,0.2)" }}>
              ✓ {selectedEmployee.name} — {selectedEmployee.phone}
            </div>
          )}
        </div>

        {/* AI Input */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>AI TASK INPUT</span>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <textarea
              placeholder={isListening ? "🎤 Listening..." : "e.g. Tell John to file GST for ABC Ltd by 5pm"}
              value={aiMessage} onChange={e => setAiMessage(e.target.value)}
              style={{ width: "100%", padding: "11px 48px 11px 14px", fontSize: "14px", height: "80px", boxSizing: "border-box", resize: "none", outline: "none", background: "#0D1117", border: isListening ? "1px solid #E24B4A" : "1px solid #30363D", borderRadius: "8px", color: "#F0F6FF", fontFamily: "'Segoe UI', sans-serif" }}
            />
            {voiceSupported && (
              <button onClick={toggleVoice}
                style={{ position: "absolute", top: "10px", right: "10px", width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer", background: isListening ? "#E24B4A" : "#21262D", color: isListening ? "white" : "#58A6FF", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isListening ? "⏹" : "🎤"}
              </button>
            )}
          </div>
          {isListening && <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#E24B4A" }}>🔴 Recording… tap ⏹ to stop</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={parseWithAI} disabled={loading || !aiMessage.trim()}
              style={{ padding: "9px 20px", background: aiMessage.trim() ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D", color: aiMessage.trim() ? "white" : "#484F58", border: "none", borderRadius: "8px", fontSize: "13px", cursor: aiMessage.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>
              {loading ? "Parsing..." : "🤖 Parse with AI"}
            </button>
            {aiMessage && (
              <button onClick={() => setAiMessage("")}
                style={{ padding: "9px 14px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Task Details */}
        <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B949E", letterSpacing: "0.05em", display: "block", marginBottom: "14px" }}>TASK DETAILS</span>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>TASK TITLE *</label>
            <input placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>CLIENT</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>CATEGORY</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>PRIORITY</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6B7A8D", display: "block", marginBottom: "5px" }}>DEADLINE</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} />
            </div>
          </div>

          <button onClick={sendTask} disabled={loading}
            style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(46,134,193,0.3)" }}>
            {loading ? "Sending..." : `💬 Send${selectedEmployee ? ` to ${selectedEmployee.name}` : " Task"}`}
          </button>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: messageType === "success" ? "rgba(56,211,159,0.1)" : "rgba(248,81,73,0.1)", border: messageType === "success" ? "1px solid rgba(56,211,159,0.3)" : "1px solid rgba(248,81,73,0.3)", color: messageType === "success" ? "#38D39F" : "#F85149" }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}