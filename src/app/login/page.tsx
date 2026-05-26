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
    <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "32px 28px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1A5276", margin: 0 }}>WhatsApp Task Manager</h1>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>{isSignup ? "Create your company account" : "Sign in to your account"}</p>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "12px", color: "#555", display: "block", marginBottom: "5px" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #DDD", borderRadius: "8px", boxSizing: "border-box", color: "#111", background: "#fff" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", color: "#555", display: "block", marginBottom: "5px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #DDD", borderRadius: "8px", boxSizing: "border-box", color: "#111", background: "#fff" }}
          />
        </div>

        {error && <div style={{ background: "#FCEBEB", color: "#A32D2D", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}
        {message && <div style={{ background: "#E1F5EE", color: "#0F6E56", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>{message}</div>}

        <button
          onClick={handleAuth}
          disabled={loading || !email || !password}
          style={{ width: "100%", padding: "12px", background: email && password ? "#1A5276" : "#CCC", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: email && password ? "pointer" : "not-allowed" }}
        >
          {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            onClick={() => { setIsSignup(!isSignup); setError(""); setMessage(""); }}
            style={{ background: "none", border: "none", color: "#2E86C1", fontSize: "13px", cursor: "pointer" }}
          >
            {isSignup ? "Already have an account? Sign in" : "New company? Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}