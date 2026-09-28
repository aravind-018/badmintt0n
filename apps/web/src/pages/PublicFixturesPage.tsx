import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Search, Filter, Clock, MapPin, Layers, Radio, Shield, ChevronRight } from 'lucide-react';
import { formatBracketParticipant } from '../components/VisualBracketTree';

export const PublicFixturesPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');

  const fetchPublicData = async () => {
    setLoading(true);
    try {
      let query = `/api/v1/matches?search=${encodeURIComponent(search)}`;
      if (categoryFilter) query += `&categoryId=${categoryFilter}`;
      if (courtFilter) query += `&courtId=${courtFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (roundFilter) query += `&round=${encodeURIComponent(roundFilter)}`;

      const [matchRes, catRes, courtRes] = await Promise.all([
        fetch(query),
        fetch('/api/v1/categories'),
        fetch('/api/v1/courts'),
      ]);

      const mData = await matchRes.json();
      const cData = await catRes.json();
      const crtData = await courtRes.json();

      setMatches(mData.matches || []);
      setCategories(cData.categories || []);
      setCourts(crtData.courts || []);
    } catch (err) {
      console.error('Error loading public fixtures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, [search, categoryFilter, courtFilter, statusFilter, roundFilter]);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-emerald flex items-center justify-center glow-green shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2 truncate">
                  Badminton Live
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Public Match Schedule & Fixtures</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/bracket"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/40 text-accent-amber text-xs font-bold transition"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Visual Bracket</span><span className="xs:hidden">Bracket</span>
            </Link>
            <Link
              to="/login"
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner */}
        <section className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-brand-500">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Tournament Fixture Schedule</h2>
            <p className="text-slate-400 text-xs mt-1">
              Browse match times, assigned court numbers, participants, and live winner progression.
            </p>
          </div>
          <Link
            to="/bracket"
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold"
          >
            <span>View Knockout Bracket Tree</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Public Filter Bar */}
        <section className="glass-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or player name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-800 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="LIVE">LIVE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </section>

        {/* Fixtures List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading match schedule...</div>
        ) : matches.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Matching Fixtures</h3>
            <p className="text-slate-400 text-xs">Try selecting a different filter or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m) => (
              <div key={m.id} className="glass-card glass-card-hover p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-400 uppercase">{m.round || 'Match'}</span>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        m.status === 'COMPLETED'
                          ? 'bg-brand-500/20 text-brand-400'
                          : m.status === 'LIVE'
                          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                          : 'bg-dark-800 text-slate-300'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-2 border-y border-slate-800">
                    <div className="flex justify-between items-center text-base">
                      <span className={`font-bold ${m.winnerId === m.sideAId ? 'text-brand-400 font-black' : 'text-white'}`}>
                        {formatBracketParticipant(m.sideAId, m.sideAName).displayName}
                      </span>
                      {m.winnerId === m.sideAId && <span className="text-xs font-bold text-brand-400">WINNER</span>}
                    </div>

                    <div className="flex justify-between items-center text-base">
                      <span className={`font-bold ${m.winnerId === m.sideBId ? 'text-brand-400 font-black' : 'text-white'}`}>
                        {formatBracketParticipant(m.sideBId, m.sideBName).displayName}
                      </span>
                      {m.winnerId === m.sideBId && <span className="text-xs font-bold text-brand-400">WINNER</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent-amber shrink-0" />
                    <span>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                    <span>{m.court?.name || 'Court TBD'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
