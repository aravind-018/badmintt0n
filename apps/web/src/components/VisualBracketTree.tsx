import React from 'react';
import { Trophy, Clock, Radio, CheckCircle, Award } from 'lucide-react';

interface Match {
  id: string;
  round?: string;
  stage?: string;
  scheduledAt?: string;
  court?: { name: string; location?: string };
  sideAId: string;
  sideAName: string;
  sideBId: string;
  sideBName: string;
  status: string;
  winnerId?: string;
  sideAGamesWon?: number;
  sideBGamesWon?: number;
  currentGameState?: any;
  nextMatchId?: string;
  nextMatchSlot?: string;
}

interface VisualBracketTreeProps {
  matches: Match[];
  onSelectMatch?: (match: Match) => void;
}

export function formatBracketParticipant(
  id?: string | null,
  name?: string | null
): { displayName: string; isTBD: boolean } {
  if (!name || !name.trim()) {
    return { displayName: 'TBD', isTBD: true };
  }

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Any unassigned slot, TBD ID, or placeholder generator label resolves to clean TBD
  if (
    !id ||
    id === 'TBD' ||
    trimmed === 'TBD' ||
    lower.startsWith('qualified') ||
    lower.startsWith('winner') ||
    lower.startsWith('runner') ||
    lower.startsWith('play-in')
  ) {
    if (id && id !== 'TBD' && !lower.startsWith('qualified') && !lower.startsWith('winner')) {
      return { displayName: trimmed, isTBD: false };
    }
    return { displayName: 'TBD', isTBD: true };
  }

  return { displayName: trimmed, isTBD: false };
}

export const VisualBracketTree: React.FC<VisualBracketTreeProps> = ({ matches, onSelectMatch }) => {
  // Filter knockout & play-in matches — exclude GROUP_STAGE and ROUND_ROBIN
  const knockoutMatches = matches.filter(
    (m) =>
      m.stage === 'KNOCKOUT' ||
      m.stage === 'PLAY_IN' ||
      (!m.stage &&
        !m.round?.toLowerCase().includes('group') &&
        !m.round?.toLowerCase().includes('round robin'))
  );

  if (knockoutMatches.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-3">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Knockout Fixtures Scheduled</h3>
        <p className="text-slate-400 text-xs">Generate fixtures to build the visual knockout bracket.</p>
      </div>
    );
  }

  // Categorize matches by round name
  const playInMatches = knockoutMatches.filter(
    (m) => m.stage === 'PLAY_IN' || m.round?.toLowerCase().includes('play-in')
  );
  const roundOf16Matches = knockoutMatches.filter(
    (m) =>
      m.stage === 'KNOCKOUT' &&
      (m.round?.toLowerCase().includes('round of 16') || m.round?.toLowerCase().includes('pre-quarter'))
  );
  const qfMatches = knockoutMatches.filter(
    (m) => m.stage === 'KNOCKOUT' && m.round?.toLowerCase().includes('quarter')
  );
  const sfMatches = knockoutMatches.filter(
    (m) => m.stage === 'KNOCKOUT' && m.round?.toLowerCase().includes('semi')
  );
  const finalMatches = knockoutMatches.filter(
    (m) =>
      m.stage === 'KNOCKOUT' &&
      m.round?.toLowerCase().includes('final') &&
      !m.round?.toLowerCase().includes('semi') &&
      !m.round?.toLowerCase().includes('quarter')
  );

  // Fallback round grouping if custom names were used
  const roundsMap = new Map<string, Match[]>();
  knockoutMatches.forEach((m) => {
    const rName = m.round || 'Knockout Round';
    if (!roundsMap.has(rName)) roundsMap.set(rName, []);
    roundsMap.get(rName)!.push(m);
  });

  const structuredRounds = [
    { title: 'PLAY-IN ROUND', matches: playInMatches, color: 'text-purple-400 border-purple-500/30' },
    { title: 'ROUND OF 16', matches: roundOf16Matches, color: 'text-indigo-400 border-indigo-500/30' },
    { title: 'QUARTER FINALS', matches: qfMatches, color: 'text-brand-400 border-brand-500/30' },
    { title: 'SEMI FINALS', matches: sfMatches, color: 'text-accent-cyan border-accent-cyan/30' },
    {
      title: 'GRAND CHAMPIONSHIP FINAL',
      matches: finalMatches,
      color: 'text-accent-amber border-accent-amber/30',
      isFinal: true,
    },
  ].filter((r) => r.matches.length > 0);

  const roundsToDisplay =
    structuredRounds.length > 0
      ? structuredRounds
      : Array.from(roundsMap.entries()).map(([title, mList]) => ({
          title: title.toUpperCase(),
          matches: mList,
          color: 'text-brand-400 border-brand-500/30',
          isFinal: title.toLowerCase().includes('final'),
        }));

  return (
    <div className="space-y-6">
      {/* Mobile Horizontal Scroll Instruction */}
      <div className="md:hidden flex items-center justify-between text-[11px] text-slate-400 bg-dark-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
        <span>👈 Scroll horizontally to view full bracket tree</span>
        <span className="text-brand-400 font-mono">SWIPE</span>
      </div>

      {/* Bracket Canvas Container */}
      <div className="overflow-x-auto select-none touch-pan-x pb-8 pt-2">
        <div
          className="flex items-stretch gap-8 min-w-[768px] lg:min-w-[1024px] px-2"
          style={{ width: `${Math.max(roundsToDisplay.length * 300, 900)}px` }}
        >
          {roundsToDisplay.map((roundGroup) => (
            <div key={roundGroup.title} className="flex-1 flex flex-col space-y-6">
              {/* Round Title Header */}
              <div
                className={`text-center font-extrabold text-xs uppercase tracking-wider pb-3 border-b-2 ${roundGroup.color} flex items-center justify-center gap-1.5 shrink-0`}
              >
                {roundGroup.isFinal && <Award className="w-4 h-4 text-accent-amber shrink-0" />}
                <span>{roundGroup.title}</span>
              </div>

              {/* Match Cards List */}
              <div className="flex-1 flex flex-col justify-around space-y-6 py-2">
                {roundGroup.matches.map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    isFinal={roundGroup.isFinal}
                    onSelect={() => onSelectMatch && onSelectMatch(m)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BracketMatchCardProps {
  match: Match;
  isFinal?: boolean;
  onSelect?: () => void;
}

const BracketMatchCard: React.FC<BracketMatchCardProps> = ({ match, isFinal, onSelect }) => {
  const sideA = formatBracketParticipant(match.sideAId, match.sideAName);
  const sideB = formatBracketParticipant(match.sideBId, match.sideBName);

  const isSideAWinner = !sideA.isTBD && match.winnerId && match.winnerId === match.sideAId;
  const isSideBWinner = !sideB.isTBD && match.winnerId && match.winnerId === match.sideBId;
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED' || match.status === 'WALKOVER' || match.status === 'RETIRED';

  // Compute set scores display if available
  let setScoreDisplayA = '';
  let setScoreDisplayB = '';
  if (match.sideAGamesWon !== undefined && match.sideBGamesWon !== undefined) {
    if (isCompleted || isLive) {
      setScoreDisplayA = `${match.sideAGamesWon}`;
      setScoreDisplayB = `${match.sideBGamesWon}`;
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`glass-card p-3.5 rounded-2xl space-y-2.5 relative transition-all duration-300 shadow-lg cursor-pointer ${
        isFinal
          ? 'border-2 border-accent-amber/60 bg-dark-800/90 shadow-amber-500/10 hover:border-accent-amber'
          : isLive
          ? 'border-2 border-rose-500/60 bg-rose-950/20 shadow-rose-500/10'
          : 'border border-slate-700/60 hover:border-brand-500/50 hover:scale-[1.02]'
      }`}
    >
      {/* Top Card Info Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
        <span className="font-semibold text-slate-300 truncate max-w-[130px]">
          {match.court?.name ||
            (match.scheduledAt
              ? new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Unscheduled')}
        </span>
        <span
          className={`font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
            isLive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
              : isCompleted
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
              : 'bg-dark-800 text-slate-400'
          }`}
        >
          {isLive && <Radio className="w-2.5 h-2.5 text-rose-400 animate-ping" />}
          {match.status}
        </span>
      </div>

      {/* Side A & Side B Rows */}
      <div className="space-y-1.5">
        {/* Side A */}
        <div
          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition ${
            isSideAWinner
              ? 'bg-brand-600/30 text-brand-300 border border-brand-500/50'
              : 'bg-dark-900/70 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {isSideAWinner ? (
              <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
            )}
            <span
              className={`truncate ${
                sideA.isTBD ? 'text-slate-500 italic font-normal tracking-wide' : 'text-slate-100 font-bold'
              }`}
            >
              {sideA.displayName}
            </span>
          </div>
          {setScoreDisplayA !== '' && (
            <span className="font-mono text-sm font-extrabold text-white shrink-0 ml-1">{setScoreDisplayA}</span>
          )}
        </div>

        {/* Side B */}
        <div
          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition ${
            isSideBWinner
              ? 'bg-brand-600/30 text-brand-300 border border-brand-500/50'
              : 'bg-dark-900/70 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {isSideBWinner ? (
              <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
            )}
            <span
              className={`truncate ${
                sideB.isTBD ? 'text-slate-500 italic font-normal tracking-wide' : 'text-slate-100 font-bold'
              }`}
            >
              {sideB.displayName}
            </span>
          </div>
          {setScoreDisplayB !== '' && (
            <span className="font-mono text-sm font-extrabold text-white shrink-0 ml-1">{setScoreDisplayB}</span>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
        <span className="text-slate-400">{match.round || 'Knockout'}</span>
        {match.court?.name && match.scheduledAt && (
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-brand-400" />
            {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};
