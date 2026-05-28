'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Send, BarChart2, Users, FolderOpen, Users as TeamIcon, 
  Plus, LogOut 
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Send', icon: Send },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/teams', label: 'Teams', icon: TeamIcon },
  { href: '/bulk', label: 'Bulk', icon: Plus },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0D1117', 
      fontFamily: "'Segoe UI', system-ui, sans-serif", 
      color: '#F0F6FF' 
    }}>
      {/* Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#161B22',
        borderBottom: '1px solid #21262D',
        padding: '14px 24px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1A5276 0%, #2E86C1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '20px',
              color: 'white'
            }}>
              T
            </div>
            <span style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px' }}>TaskSend</span>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href === '/' && pathname === '/');
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isActive ? '#FFFFFF' : '#8B949E',
                    background: isActive ? '#21262D' : 'transparent',
                    border: isActive ? '1px solid #2E86C1' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}

            <button
              onClick={async () => {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#F85149',
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                marginLeft: '12px'
              }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
