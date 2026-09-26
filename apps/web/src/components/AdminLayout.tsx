import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Layers, Users, UserCheck, LayoutGrid, LogOut, LayoutDashboard, Calendar, Menu, X } from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Tournaments', path: '/admin/tournaments', icon: Trophy },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Teams', path: '/admin/teams', icon: Users },
    { label: 'Players', path: '/admin/players', icon: UserCheck },
    { label: 'Courts', path: '/admin/courts', icon: LayoutGrid },
    { label: 'Fixtures & Bracket', path: '/admin/fixtures', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col overflow-x-hidden">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-emerald flex items-center justify-center glow-green shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2 truncate">
                  Badminton Live <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold shrink-0">Admin</span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden xs:block truncate">Tournament Management System</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{user?.name}</div>
              <div className="text-xs text-brand-400 font-mono">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-xs font-semibold text-slate-300 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              aria-label="Toggle Admin Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-dark-900/95 backdrop-blur-lg px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Navigation Sub-bar (Desktop & Tablet) */}
      <nav className="border-b border-slate-800/80 bg-dark-900/90 backdrop-blur-md sticky top-[64px] z-30 hidden md:block overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md glow-green'
                    : 'text-slate-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
};
