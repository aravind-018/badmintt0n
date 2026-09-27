import React from 'react';
import { Shield, Trophy, CheckCircle2, Clock, CheckCircle } from 'lucide-react';

interface StandingItem {
  id: string;
  groupName?: string;
  position: number;
  team?: { name: string; organization?: string };
  teamName?: string;
  played: number;
  won: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  pointsScored: number;
  pointsConceded: number;
  tournamentPoints: number;
  qualified: boolean;
  qualificationStatus?: string;
}

interface GroupStageViewProps {
  groups: Record<string, StandingItem[]>;
  groupMatches?: any[];
  progress?: { totalMatches: number; completedMatches: number; isGroupStageComplete: boolean };
}

export const GroupStageView: React.FC<GroupStageViewProps> = ({ groups, groupMatches = [], progress }) => {
  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-3">
        <Shield className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Group Stage Data</h3>
        <p className="text-slate-400 text-xs">Generate group fixtures to populate group stage standings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      {progress && (
        <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-brand-500/30">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-500" />
              {progress.isGroupStageComplete ? 'Group Stage Completed' : 'Group Stage In Progress'}
            </span>
            <p className="text-slate-300 text-xs mt-0.5">
              {progress.completedMatches} / {progress.totalMatches} group matches completed
            </p>
          </div>
          <div className="w-full sm:w-48 bg-dark-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-brand-600 to-accent-emerald h-full transition-all duration-500"
              style={{
                width: `${progress.totalMatches > 0 ? (progress.completedMatches / progress.totalMatches) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groupKeys.map((groupName) => {
          const standingsList = groups[groupName] || [];

          return (
            <div key={groupName} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-700/60 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-400" /> {groupName}
                </h3>
                <span className="text-[11px] font-semibold text-slate-400 bg-dark-800 px-2.5 py-1 rounded-full border border-slate-700">
                  {standingsList.length} Teams
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Team / Player</th>
                      <th className="py-2 px-2 text-center">P</th>
                      <th className="py-2 px-2 text-center">W</th>
                      <th className="py-2 px-2 text-center">L</th>
                      <th className="py-2 px-2 text-center font-bold text-white">PTS</th>
                      <th className="py-2 px-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {standingsList.map((row) => {
                      const name = row.team?.name || row.teamName || 'Team';
                      const isQualified = row.qualified || row.qualificationStatus === 'QUALIFIED';

                      return (
                        <tr
                          key={row.id}
                          className={`transition ${
                            isQualified ? 'bg-brand-500/10 text-white font-bold' : 'hover:bg-dark-800/50 text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-2 font-mono text-slate-400">{row.position}</td>
                          <td className="py-2.5 px-2 font-semibold">
                            <div className="flex items-center gap-1.5">
                              {isQualified && <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                              <span className="truncate max-w-[140px]">{name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400">{row.played}</td>
                          <td className="py-2.5 px-2 text-center text-brand-400 font-bold">{row.won}</td>
                          <td className="py-2.5 px-2 text-center text-rose-400">{row.lost}</td>
                          <td className="py-2.5 px-2 text-center font-extrabold text-white text-sm">{row.tournamentPoints}</td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isQualified
                                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                  : row.qualificationStatus === 'ELIMINATED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-dark-800 text-slate-400'
                              }`}
                            >
                              {row.qualificationStatus || (isQualified ? 'QUALIFIED' : 'PENDING')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
