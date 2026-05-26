"use client";

import { useState, useEffect, useRef } from "react";

type Employee = {
  id: string;
  name: string;
  phone: string;
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [title, setTitle] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchEmployees();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAiMessage(transcript);
      };

      recognition.onend = () => setIsListening(false);

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setMessage("Microphone access denied. Please allow mic permission.");
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setAiMessage("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch("/api/employees");
    const data = await res.json();
    if (data.success) setEmployees(data.employees);
  };

  const addEmployee = async () => {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, phone: newPhone }),
    });
    const data = await res.json();
    if (data.success) {
      setNewName("");
      setNewPhone("");
      setShowAddEmployee(false);
      fetchEmployees();
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
      const match = employees.find((e) =>
        aiMessage.toLowerCase().includes(e.name.toLowerCase())
      );
      if (match) setSelectedEmployee(match);
      setMessage("AI parsed the task. Review and click Send Task.");
    } else {
      setMessage("AI could not parse. Please fill manually.");
    }
    setLoading(false);
  };

  const sendTask = async () => {
    if (!selectedEmployee) {
      setMessage("Please select an employee.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/create-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assigned_to: selectedEmployee.phone }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`Task sent to ${selectedEmployee.name} on WhatsApp!`);
      setTitle("");
      setSelectedEmployee(null);
      setAiMessage("");
    } else {
      setMessage("Error: " + data.error);
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "540px" }}>
      <h1 style={{ color: "#1A5276" }}>WhatsApp Task Manager</h1>

      {/* Dashboard Button */}
      <div style={{ marginTop: "12px", marginBottom: "8px" }}>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#1A5276",
            color: "white",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          📊 View Task Dashboard
        </a>
      </div>

      {/* Employee List */}
      <div style={{ marginTop: "16px", padding: "20px", border: "1px solid #CCCCCC", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#555" }}>Employees</h3>
          <button
            onClick={() => setShowAddEmployee(!showAddEmployee)}
            style={{ padding: "6px 14px", backgroundColor: "#1A5276", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
          >
            + Add Employee
          </button>
        </div>

        {showAddEmployee && (
          <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ flex: 1, padding: "8px", fontSize: "14px", minWidth: "120px" }}
            />
            <input
              placeholder="+91..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              style={{ flex: 1, padding: "8px", fontSize: "14px", minWidth: "120px" }}
            />
            <button
              onClick={addEmployee}
              style={{ padding: "8px 16px", backgroundColor: "#1E8449", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        )}

        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {employees.length === 0 && (
            <p style={{ color: "#999", fontSize: "13px" }}>No employees yet. Add one above.</p>
          )}
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              style={{
                padding: "8px 14px",
                backgroundColor: selectedEmployee?.id === emp.id ? "#1A5276" : "#EBF5FB",
                color: selectedEmployee?.id === emp.id ? "white" : "#1A5276",
                border: "1px solid #2E86C1",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {emp.name}
            </button>
          ))}
        </div>
        {selectedEmployee && (
          <p style={{ marginTop: "8px", fontSize: "13px", color: "#555" }}>
            Selected: <b>{selectedEmployee.name}</b> — {selectedEmployee.phone}
          </p>
        )}
      </div>

      {/* AI Input */}
      <div style={{ marginTop: "16px", padding: "20px", border: "1px solid #2E86C1", borderRadius: "8px" }}>
        <h3 style={{ margin: "0 0 12px", color: "#2E86C1" }}>AI Task Input</h3>

        <div style={{ position: "relative" }}>
          <textarea
            placeholder={isListening ? "🎤 Listening... speak now" : "Tell John to clean the office by 5pm"}
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 48px 10px 10px",
              fontSize: "14px",
              height: "80px",
              boxSizing: "border-box",
              borderColor: isListening ? "#E74C3C" : undefined,
              outline: isListening ? "2px solid #E74C3C" : undefined,
              resize: "vertical",
            }}
          />
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              title={isListening ? "Stop recording" : "Speak task"}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isListening ? "#E74C3C" : "#2E86C1",
                color: "white",
                boxShadow: isListening ? "0 0 0 4px rgba(231,76,60,0.25)" : "none",
                animation: isListening ? "pulse 1.2s infinite" : "none",
              }}
            >
              {isListening ? "⏹" : "🎤"}
            </button>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%   { box-shadow: 0 0 0 0 rgba(231,76,60,0.5); }
            70%  { box-shadow: 0 0 0 8px rgba(231,76,60,0); }
            100% { box-shadow: 0 0 0 0 rgba(231,76,60,0); }
          }
        `}</style>

        {isListening && (
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#E74C3C" }}>
            🔴 Recording… tap ⏹ to stop
          </p>
        )}

        <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
          <button
            onClick={parseWithAI}
            disabled={loading || !aiMessage.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: aiMessage.trim() ? "#2E86C1" : "#CCCCCC",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: aiMessage.trim() ? "pointer" : "not-allowed",
              fontSize: "14px",
            }}
          >
            {loading ? "Parsing..." : "Parse with AI"}
          </button>
          {aiMessage && (
            <button
              onClick={() => setAiMessage("")}
              style={{ padding: "10px 14px", backgroundColor: "#F8F9FA", color: "#555", border: "1px solid #CCC", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div style={{ marginTop: "16px", padding: "20px", border: "1px solid #CCCCCC", borderRadius: "8px" }}>
        <h3 style={{ margin: "0 0 12px", color: "#555" }}>Task Details</h3>
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: "10px", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box" }}
        />
        <button
          onClick={sendTask}
          disabled={loading || !selectedEmployee}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: selectedEmployee ? "#1A5276" : "#CCCCCC",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: selectedEmployee ? "pointer" : "not-allowed",
            fontSize: "16px",
          }}
        >
          {loading ? "Sending..." : `Send Task${selectedEmployee ? ` to ${selectedEmployee.name}` : ""}`}
        </button>
      </div>

      {message && (
        <p style={{ marginTop: "16px", padding: "12px", backgroundColor: "#D6EAF8", borderRadius: "4px", color: "#1A5276" }}>
          {message}
        </p>
      )}
    </main>
  );
}