"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Pencil, Trash2, FolderOpen, ArrowRight } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Category = { id: string; name: string; color: string; frequency: string; created_at: string; };

const FREQUENCIES = [
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const COLORS = [
  "#2E86C1", "#1A5276", "#0F6E56", "#854F0B",
  "#A32D2D", "#534AB7", "#993C1D", "#1A6B3C",
];

const DEFAULT_CATEGORIES = [
  { name: "GST Filing", color: "#0F6E56", frequency: "monthly" },
  { name: "Income Tax Return", color: "#2E86C1", frequency: "yearly" },
  { name: "ROC Filing", color: "#534AB7", frequency: "yearly" },
  { name: "Annual Audit", color: "#854F0B", frequency: "yearly" },
  { name: "Accounts & Bookkeeping", color: "#1A5276", frequency: "monthly" },
  { name: "TDS Filing", color: "#993C1D", frequency: "quarterly" },
  { name: "Payroll", color: "#1A6B3C", frequency: "monthly" },
];

export default function CategoriesPage() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", color: "#2E86C1", frequency: "one_time" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
      else { setUser(session.user); fetchCategories(); }
    });
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
    setLoading(false);
  }

  async function saveCategory() {
    if (!form.name.trim()) { showToast("Category name is required"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (editCategory) {
      const { error } = await supabase.from("categories").update({ ...form }).eq("id", editCategory.id);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Category updated");
    } else {
      const { error } = await supabase.from("categories").insert([{ ...form, user_id: session?.user.id }]);
      if (error) { showToast("Error: " + error.message); return; }
      showToast("Category added");
    }
    setForm({ name: "", color: "#2E86C1", frequency: "one_time" });
    setShowForm(false); setEditCategory(null);
    fetchCategories();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    await supabase.from("categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
    showToast("Category deleted");
  }

  async function addDefaults() {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("categories").insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: session?.user.id })));
    showToast("Default categories added");
    fetchCategories();
  }

  function startEdit(cat: Category) {
    setEditCategory(cat);
    setForm({ name: cat.name, color: cat.color, frequency: cat.frequency });
    setShowForm(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const freqLabel = (f: string) => FREQUENCIES.find(x => x.value === f)?.label || f;

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
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>Service Categories</h1>
            <p style={{ fontSize: "14px", color: "#8B949E", margin: 0 }}>GST Filing, ROC, Audit and more</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {categories.length === 0 && (
              <button onClick={addDefaults}
                style={{ padding: "10px 16px", background: "#21262D", color: "#58A6FF", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                Add Defaults
              </button>
            )}
            <button onClick={() => { setShowForm(!showForm); setEditCategory(null); setForm({ name: "", color: "#2E86C1", frequency: "one_time" }); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500, boxShadow: "0 4px 12px rgba(46,134,193,0.25)" }}>
              <Plus size={15} /> Add Category
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 20px" }}>
              {editCategory ? "Edit Category" : "New Category"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>CATEGORY NAME *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. GST Filing" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>FREQUENCY</label>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", color: "#8B949E", display: "block", marginBottom: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>COLOR</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid white" : "3px solid transparent", boxSizing: "border-box", boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none" }} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveCategory}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                {editCategory ? "Update Category" : "Save Category"}
              </button>
              <button onClick={() => { setShowForm(false); setEditCategory(null); }}
                style={{ padding: "10px 16px", background: "transparent", color: "#6B7A8D", border: "1px solid #30363D", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Category Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", height: "120px", opacity: 0.4 }} />)}
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#484F58" }}>
            <FolderOpen size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: "16px", marginBottom: "8px" }}>No categories yet</div>
            <div style={{ fontSize: "13px", color: "#6B7A8D", marginBottom: "20px" }}>Add default CA firm categories to get started</div>
            <button onClick={addDefaults}
              style={{ padding: "12px 24px", background: "linear-gradient(135deg, #1A5276, #2E86C1)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
              Add Default Categories
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ background: "#161B22", border: "1px solid #21262D", borderRadius: "12px", padding: "18px", borderLeft: `4px solid ${cat.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0F6FF", marginBottom: "8px" }}>{cat.name}</div>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40` }}>
                      {freqLabel(cat.frequency)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => startEdit(cat)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "#21262D", color: "#8B949E", border: "1px solid #30363D", borderRadius: "7px", cursor: "pointer" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "rgba(248,81,73,0.1)", color: "#F85149", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "7px", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <a href={`/dashboard?category=${cat.id}`}
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