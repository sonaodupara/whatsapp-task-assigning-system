"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleAuth() {
    setLoading(true);
    setError("");
    setMessage("");
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Account created! You can now log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/";
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0D1117 0%, #0D1F2D 50%, #0D1117 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif", padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "linear-gradient(135deg, #1A5276, #2E86C1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(46,134,193,0.3)",
          }}>💬</div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#F0F6FF", margin: "0 0 6px" }}>
            TaskSend
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7A8D", margin: 0 }}>
            {isSignup ? "Create your company account" : "Sign in to your workspace"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#161B22",
          border: "1px solid #21262D",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 500 }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="you@company.com"
              style={{
                width: "100%", padding: "11px 14px", fontSize: "14px",
                background: "#0D1117", border: "1px solid #30363D",
                borderRadius: "8px", boxSizing: "border-box",
                color: "#F0F6FF", outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 500 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "11px 14px", fontSize: "14px",
                background: "#0D1117", border: "1px solid #30363D",
                borderRadius: "8px", boxSizing: "border-box",
                color: "#F0F6FF", outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", color: "#F85149", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: "rgba(56,211,159,0.1)", border: "1px solid rgba(56,211,159,0.3)", color: "#38D39F", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              {message}
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "12px",
              background: email && password ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "#21262D",
              color: email && password ? "white" : "#484F58",
              border: "none", borderRadius: "8px", fontSize: "14px",
              fontWeight: 600, cursor: email && password ? "pointer" : "not-allowed",
              boxShadow: email && password ? "0 4px 16px rgba(46,134,193,0.3)" : "none",
            }}
          >
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "18px", paddingTop: "18px", borderTop: "1px solid #21262D" }}>
            <button
              onClick={() => { setIsSignup(!isSignup); setError(""); setMessage(""); }}
              style={{ background: "none", border: "none", color: "#58A6FF", fontSize: "13px", cursor: "pointer" }}
            >
              {isSignup ? "Already have an account? Sign in" : "New company? Create account"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "#484F58", marginTop: "20px" }}>
          Each company account sees only their own data
        </p>
      </div>
    </div>
  );
}