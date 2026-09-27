import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Layers, Shield, Loader2 } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { VisualBracketTree } from '../components/VisualBracketTree';
import { GroupStageView } from '../components/GroupStageView';

export const VisualBracketPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [groupStandings, setGroupStandings] = useState<Record<string, any[]>>({});
  const [groupProgress, setGroupProgress] = useState<any>(null);
  const [stageTab, setStageTab] = useState<'GROUP_STAGE' | 'KNOCKOUT'>('KNOCKOUT');

  const fetchBracketData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch('/api/v1/categories');
      const cData = await catRes.json();
      const catList = cData.categories || [];
      setCategories(catList);

      let activeCat = selectedCategory;
      if (!activeCat && catList.length > 0) {
        const catWithMatches = catList.find((c: any) => c._count?.matches > 0);
        activeCat = catWithMatches ? catWithMatches.id : catList[0].id;
        setSelectedCategory(activeCat);
      }

      const matchUrl = activeCat ? `/api/v1/matches?categoryId=${activeCat}` : '/api/v1/matches';
      const matchRes = await fetch(matchUrl);
      const mData = await matchRes.json();
      setMatches(mData.matches || []);

      if (activeCat) {
        const activeTournId = catList.find((c: any) => c.id === activeCat)?.tournamentId;
        if (activeTournId) {
          fetchGroupStandings(activeTournId, activeCat);
        }
      }
    } catch (err) {
      console.error('Failed to load bracket data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupStandings = async (tId: string, cId: string) => {
    try {
      const res = await fetch(`/api/v1/matches/group-standings?tournamentId=${tId}&categoryId=${cId}`);
      const data = await res.json();
      if (res.ok) {
        setGroupStandings(data.groups || {});
        setGroupProgress(data.progress || null);
      }
    } catch (err) {
      console.error('Failed to fetch group standings:', err);
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
                <p className="text-[11px] sm:text-xs text-slate-400">Interactive Visual Tournament Bracket & Group Stage</p>
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

      {/* Category Tabs & Stage Toggle */}
      <nav className="border-b border-slate-800 bg-dark-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Category:</span>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === c.id
                    ? 'bg-accent-amber text-dark-900 shadow-lg'
                    : 'bg-dark-800 text-slate-400 hover:text-white'
                }`}
              >
                {c.type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-dark-800 p-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setStageTab('KNOCKOUT')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                stageTab === 'KNOCKOUT' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Knockout Bracket
            </button>
            <button
              type="button"
              onClick={() => setStageTab('GROUP_STAGE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                stageTab === 'GROUP_STAGE' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Group Stage
            </button>
          </div>
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              {stageTab === 'KNOCKOUT' ? (
                <>
                  <Layers className="w-6 h-6 text-accent-amber" /> Knockout Stage Bracket
                </>
              ) : (
                <>
                  <Shield className="w-6 h-6 text-brand-400" /> Group Stage Standings
                </>
              )}
            </h2>
            <p className="text-slate-400 text-xs mt-1">Automatic winner progression & real-time live score updates</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Loading bracket tree...
          </div>
        ) : stageTab === 'GROUP_STAGE' ? (
          <GroupStageView groups={groupStandings} progress={groupProgress} />
        ) : (
          <VisualBracketTree matches={matches} />
        )}
      </main>
    </div>
  );
};
