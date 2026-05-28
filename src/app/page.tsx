'use client';

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Mic, Square, Plus, CheckCircle } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Employee = { id: string; name: string; phone: string; };
type Client = { id: string; name: string; type: string; };
type Category = { id: string; name: string; color: string; frequency: string; };

export default function SendTask() {
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
      r.continuous = false;
      r.interimResults = true;
      r.lang = "en-IN";
      r.onresult = (e: any) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        setAiMessage(t);
      };
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
      body: JSON.stringify({ title, assigned_to: selectedEmployee.phone, priority, deadline: deadline || null, client_id: selectedClient || null, client_name: clientName, category_id: selectedCategory || null, category_name: categoryName }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`Task sent to ${selectedEmployee.name}`); setMessageType("success");
      setTitle(""); setSelectedEmployee(null); setAiMessage("");
      setSelectedClient(""); setSelectedCategory(""); setDeadline(""); setPriority("Medium");
    } else {
      setMessage("Error: " + data.error); setMessageType("error");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    background: "#0D1117", border: "1px solid #30363D",
    borderRadius: "10px", color: "#F0F6FF", outline: "none",
    boxSizing: "border-box" as const,
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#58A6FF" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Send New Task</h1>
        <p style={{ color: "#8B949E", marginTop: "6px", marginBottom: 0 }}>Assign tasks to your team via WhatsApp</p>
      </div>

      {/* Team Members */}
      <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", letterSpacing: "0.08em" }}>TEAM MEMBERS</div>
          <button onClick={() => setShowAddEmployee(!showAddEmployee)}
            style={{ padding: "6px 14px", background: "#21262D", color: "#58A6FF", border: "1px solid #30363D", borderRadius: "8px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={14} /> Add Member
          </button>
        </div>

        {showAddEmployee && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", marginBottom: "16px" }}>
            <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
            <input placeholder="+91 Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inputStyle} />
            <button onClick={addEmployee} style={{ padding: "12px 16px", background: "#238636", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>Save</button>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {employees.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
              style={{ padding: "9px 18px", borderRadius: "9999px", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: selectedEmployee?.id === emp.id ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D", color: selectedEmployee?.id === emp.id ? "white" : "#8B949E", border: selectedEmployee?.id === emp.id ? "1px solid #2E86C1" : "1px solid #30363D" }}>
              {emp.name}
            </button>
          ))}
        </div>

        {selectedEmployee && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(46,134,193,0.1)", borderRadius: "10px", border: "1px solid rgba(46,134,193,0.2)", color: "#58A6FF", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={16} /> {selectedEmployee.name} · {selectedEmployee.phone}
          </div>
        )}
      </div>

      {/* AI Input */}
      <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", marginBottom: "16px", letterSpacing: "0.08em" }}>AI TASK INPUT</div>

        <div style={{ position: "relative", marginBottom: "14px" }}>
          <textarea
            placeholder={isListening ? "Listening..." : "Speak or type task description..."}
            value={aiMessage}
            onChange={e => setAiMessage(e.target.value)}
            style={{
              width: "100%", height: "100px",
              padding: "14px", paddingRight: voiceSupported ? "60px" : "14px",
              background: "#0D1117",
              border: isListening ? "1px solid #E24B4A" : "1px solid #30363D",
              borderRadius: "10px", color: "#F0F6FF", fontSize: "14px",
              resize: "none", outline: "none", boxSizing: "border-box" as const,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          />
          {voiceSupported && (
            <button onClick={toggleVoice}
              style={{
                position: "absolute", top: "12px", right: "12px",
                width: "38px", height: "38px", borderRadius: "50%",
                background: isListening ? "#E24B4A" : "#21262D",
                color: "white", border: isListening ? "none" : "1px solid #30363D",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
              {isListening ? <Square size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        <button onClick={parseWithAI} disabled={loading || !aiMessage.trim()}
          style={{ padding: "11px 24px", background: aiMessage.trim() ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D", color: aiMessage.trim() ? "white" : "#484F58", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "13px", cursor: aiMessage.trim() ? "pointer" : "not-allowed" }}>
          {loading ? "Parsing..." : "Parse with AI"}
        </button>
      </div>

      {/* Task Details */}
      <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B949E", marginBottom: "18px", letterSpacing: "0.08em" }}>TASK DETAILS</div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>TASK TITLE *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>CLIENT</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>CATEGORY</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>PRIORITY</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>DEADLINE</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} />
          </div>
        </div>

        <button onClick={sendTask} disabled={loading || !selectedEmployee}
          style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: loading || !selectedEmployee ? "not-allowed" : "pointer", opacity: loading || !selectedEmployee ? 0.7 : 1, boxShadow: "0 4px 16px rgba(46,134,193,0.3)" }}>
          {loading ? "Sending..." : `Send Task${selectedEmployee ? ` to ${selectedEmployee.name}` : ""}`}
        </button>
      </div>

      {message && (
        <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "10px", background: messageType === "success" ? "rgba(56,211,159,0.1)" : "rgba(248,81,73,0.1)", border: messageType === "success" ? "1px solid rgba(56,211,159,0.4)" : "1px solid rgba(248,81,73,0.4)", color: messageType === "success" ? "#38D39F" : "#F85149", fontSize: "14px", fontWeight: 500 }}>
          {message}
        </div>
      )}
    </div>
  );
}