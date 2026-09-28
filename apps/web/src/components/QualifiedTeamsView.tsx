import React from 'react';
import { Shield, CheckCircle2, Award } from 'lucide-react';

interface StandingItem {
  id: string;
  groupName?: string;
  position: number;
  team?: { name: string; organization?: string };
  teamName?: string;
  qualified: boolean;
  qualificationStatus?: string;
}

interface QualifiedTeamsViewProps {
  groups: Record<string, StandingItem[]>;
}

export const QualifiedTeamsView: React.FC<QualifiedTeamsViewProps> = ({ groups }) => {
  const groupKeys = Object.keys(groups);

  // Filter only qualified teams
  const qualifiedByGroup: Record<string, StandingItem[]> = {};
  let totalQualifiedCount = 0;

  for (const gName of groupKeys) {
    const qualifiedInGroup = (groups[gName] || []).filter(
      (s) => s.qualified || s.qualificationStatus === 'QUALIFIED'
    );
    if (qualifiedInGroup.length > 0) {
      qualifiedByGroup[gName] = qualifiedInGroup;
      totalQualifiedCount += qualifiedInGroup.length;
    }
  }

  const qualifiedGroupKeys = Object.keys(qualifiedByGroup);

  if (qualifiedGroupKeys.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-3">
        <Award className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Qualified Teams Yet</h3>
        <p className="text-slate-400 text-xs">
          Complete group stage matches to automatically determine qualified teams for the knockout stage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-brand-500/30">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-500" />
            Qualified For Knockout Stage
          </h3>
          <p className="text-slate-300 text-xs mt-0.5">
            Top qualifying teams from each group entering the knockout bracket
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 font-extrabold text-brand-300 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-brand-400" />
          Total Qualified: {totalQualifiedCount} / {totalQualifiedCount}
        </div>
      </div>

      {/* Group Qualified Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {qualifiedGroupKeys.map((groupName) => {
          const list = qualifiedByGroup[groupName] || [];

          return (
            <div
              key={groupName}
              className="glass-card p-4 rounded-2xl space-y-3 border border-brand-500/20 bg-brand-500/5 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-brand-500/20 pb-2.5">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-400" /> {groupName}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {list.length} Qualified
                </span>
              </div>

              <div className="space-y-2">
                {list.map((item) => {
                  const name = item.team?.name || item.teamName || 'Team';
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-dark-800/90 border border-brand-500/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="font-bold text-white truncate">{name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                        #{item.position}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
