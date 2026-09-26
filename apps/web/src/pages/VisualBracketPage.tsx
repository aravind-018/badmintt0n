import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Clock, MapPin, Layers, Award, ChevronRight, Zap } from 'lucide-react';
import { getSocket } from '../lib/socket';

export const VisualBracketPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchBracketData = async () => {
    setLoading(true);
    try {
      const [catRes, matchRes] = await Promise.all([
        fetch('/api/v1/categories'),
        fetch(`/api/v1/matches${selectedCategory ? `?categoryId=${selectedCategory}` : ''}`),
      ]);

      const cData = await catRes.json();
      const mData = await matchRes.json();

      setCategories(cData.categories || []);
      setMatches(mData.matches || []);

      if (cData.categories?.length > 0 && !selectedCategory) {
        setSelectedCategory(cData.categories[0].id);
      }
    } catch (err) {
      console.error('Failed to load bracket data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBracketData();

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('join:live');
    } else {
      socket.once('connect', () => {
        socket.emit('join:live');
      });
    }

    const handleRefresh = () => {
      fetchBracketData();
    };

    // Instant refresh whenever any match finishes, starts, or fixture updates
    socket.on('match:completed', handleRefresh);
    socket.on('fixture:updated', handleRefresh);
    socket.on('match:started', handleRefresh);

    window.addEventListener('focus', handleRefresh);

    return () => {
      socket.off('match:completed', handleRefresh);
      socket.off('fixture:updated', handleRefresh);
      socket.off('match:started', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [selectedCategory]);

  // Group matches by round name
  const quarterFinals = matches.filter((m) => m.round === 'Quarter Final');
  const semiFinals = matches.filter((m) => m.round === 'Semi Final');
  const finals = matches.filter((m) => m.round === 'Final');

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col overflow-x-hidden">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-emerald flex items-center justify-center glow-green shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                  Badminton Live
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400">Interactive Visual Tournament Bracket</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/fixtures"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-brand-500" /> <span className="hidden sm:inline">Full Fixtures List</span><span className="sm:hidden">Fixtures</span>
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="border-b border-slate-800 bg-dark-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 py-3 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-2">Category:</span>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-accent-amber text-dark-900 shadow-lg'
                  : 'bg-dark-800 text-slate-400 hover:text-white'
              }`}
            >
              {c.type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Bracket Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-accent-amber" /> Knockout Stage Bracket
            </h2>
            <p className="text-slate-400 text-xs mt-1">Automatic winner progression & live match status</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading bracket tree...</div>
        ) : matches.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Bracket Matches Found</h3>
            <p className="text-slate-400 text-xs">Generate fixtures in Admin panel to populate bracket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[900px] grid grid-cols-3 gap-8 relative items-center">
              {/* Column 1: Quarter Finals */}
              <div className="space-y-6">
                <div className="text-center font-bold text-xs uppercase tracking-wider text-brand-400 pb-2 border-b border-brand-500/30">
                  Quarter Finals
                </div>
                <div className="space-y-8">
                  {quarterFinals.length > 0 ? (
                    quarterFinals.map((m) => (
                      <BracketCard key={m.id} match={m} />
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-4">No Quarter Finals</div>
                  )}
                </div>
              </div>

              {/* Column 2: Semi Finals */}
              <div className="space-y-6">
                <div className="text-center font-bold text-xs uppercase tracking-wider text-accent-cyan pb-2 border-b border-accent-cyan/30">
                  Semi Finals
                </div>
                <div className="space-y-16 py-4">
                  {semiFinals.length > 0 ? (
                    semiFinals.map((m) => (
                      <BracketCard key={m.id} match={m} />
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-4">No Semi Finals</div>
                  )}
                </div>
              </div>

              {/* Column 3: Championship Final */}
              <div className="space-y-6">
                <div className="text-center font-bold text-xs uppercase tracking-wider text-accent-amber pb-2 border-b border-accent-amber/30 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 text-accent-amber" /> Grand Championship Final
                </div>
                <div className="py-8">
                  {finals.length > 0 ? (
                    finals.map((m) => (
                      <BracketCard key={m.id} match={m} isFinal />
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-4">No Final Scheduled</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Bracket Match Card Component
const BracketCard: React.FC<{ match: any; isFinal?: boolean }> = ({ match, isFinal }) => {
  const isSideAWinner = match.winnerId && match.winnerId === match.sideAId;
  const isSideBWinner = match.winnerId && match.winnerId === match.sideBId;

  return (
    <div
      className={`glass-card p-4 rounded-2xl space-y-3 relative transition-all duration-300 hover:scale-[1.02] border ${
        isFinal
          ? 'border-accent-amber/50 glow-cyan bg-dark-800/90'
          : 'border-slate-700/60 hover:border-brand-500/40'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-2">
        <span className="font-semibold text-slate-300">{match.court?.name || 'Court TBD'}</span>
        <span
          className={`font-bold px-2 py-0.5 rounded-full ${
            match.status === 'COMPLETED'
              ? 'bg-brand-500/20 text-brand-400'
              : match.status === 'LIVE'
              ? 'bg-rose-500/20 text-rose-400 animate-pulse'
              : 'bg-dark-800 text-slate-400'
          }`}
        >
          {match.status}
        </span>
      </div>

      <div className="space-y-2 py-1">
        {/* Side A */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
            isSideAWinner
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
              : 'bg-dark-900/60 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isSideAWinner && <Trophy className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
            <span className="truncate">{match.sideAName}</span>
          </div>
          {isSideAWinner && <span className="text-[10px] text-brand-400">WINNER</span>}
        </div>

        {/* Side B */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
            isSideBWinner
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
              : 'bg-dark-900/60 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isSideBWinner && <Trophy className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
            <span className="truncate">{match.sideBName}</span>
          </div>
          {isSideBWinner && <span className="text-[10px] text-brand-400">WINNER</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-accent-amber" />
          <span>{match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
        </div>
        <span className="font-mono text-slate-500">{match.round}</span>
      </div>
    </div>
  );
};
