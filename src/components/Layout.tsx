'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, BarChart2, Users, FolderOpen, Plus, LogOut, Menu, X, CalendarDays } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Send', icon: Send },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/bulk', label: 'Bulk', icon: Plus },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#F0F6FF' }}>

      {!hideNav && (
        <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#161B22', borderBottom: '1px solid #21262D' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #1A5276, #2E86C1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: 'white', flexShrink: 0 }}>
                T
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>TaskSend</span>
            </div>

            {/* Desktop Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: isActive ? '#F0F6FF' : '#8B949E', background: isActive ? '#21262D' : 'transparent', border: isActive ? '1px solid #2E86C1' : '1px solid transparent', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    <Icon size={15} />{label}
                  </Link>
                );
              })}
              <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#F85149', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginLeft: '4px' }}>
                <LogOut size={15} /> Sign Out
              </button>
            </nav>

            {/* Mobile Hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#21262D', border: '1px solid #30363D', borderRadius: '8px', cursor: 'pointer', color: '#F0F6FF' }}
              className="mobile-menu-btn">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <div style={{ background: '#161B22', borderTop: '1px solid #21262D', padding: '8px 16px 16px' }}>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: isActive ? '#F0F6FF' : '#8B949E', background: isActive ? '#21262D' : 'transparent', textDecoration: 'none', marginBottom: '4px', border: isActive ? '1px solid #2E86C1' : '1px solid transparent' }}>
                    <Icon size={17} />{label}
                  </Link>
                );
              })}
              <button onClick={signOut}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#F85149', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', marginTop: '4px' }}>
                <LogOut size={17} /> Sign Out
              </button>
            </div>
          )}
        </header>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          nav { display: none !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {children}
    </div>
  );
}