// =============================================================================
// Shared Types — used by both API and Web
// =============================================================================

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  version: string;
  environment: string;
}

// ---------------------------------------------------------------------------
// Socket.IO Event Payloads
// ---------------------------------------------------------------------------

export interface MatchStatePayload {
  matchId: string;
  status: string;
  currentGame: number;
  games: Array<{
    gameNumber: number;
    sideAPoints: number;
    sideBPoints: number;
    winner?: string;
    isComplete: boolean;
  }>;
  sideA: { name: string; gamesWon: number };
  sideB: { name: string; gamesWon: number };
  winner?: string;
  isMatchComplete: boolean;
  serverTime: string;
}

export interface ScoringActionPayload {
  matchId: string;
  action: 'POINT_SIDE_A' | 'POINT_SIDE_B';
  requestId: string;
}

export interface ScoringErrorPayload {
  requestId: string;
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Common enums (mirrored from Prisma for frontend use)
// ---------------------------------------------------------------------------

export type MatchStatus =
  | 'SCHEDULED'
  | 'CALLED'
  | 'READY'
  | 'LIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'WALKOVER'
  | 'RETIRED';

export type TournamentStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type TournamentFormat = 'KNOCKOUT' | 'ROUND_ROBIN' | 'GROUP_KNOCKOUT';

export type CategoryType =
  | 'MENS_SINGLES'
  | 'WOMENS_SINGLES'
  | 'MENS_DOUBLES'
  | 'WOMENS_DOUBLES'
  | 'MIXED_DOUBLES'
  | 'TEAM_EVENT';

export type UserRole = 'SUPER_ADMIN' | 'TOURNAMENT_ADMIN' | 'SCORER' | 'VIEWER';
export type Role = UserRole;

// ---------------------------------------------------------------------------
// Tournament & Bracket Utilities
// ---------------------------------------------------------------------------

/**
 * Checks whether a number is a positive power of 2.
 * Uses mathematically safe bitwise logic.
 */
export function isPowerOfTwo(value: number): boolean {
  return value > 0 && Number.isInteger(value) && (value & (value - 1)) === 0;
}

/**
 * Calculates the smallest power of 2 greater than or equal to teamCount.
 */
export function getNextPowerOfTwo(teamCount: number): number {
  if (teamCount <= 0) return 1;
  let power = 1;
  while (power < teamCount) {
    power *= 2;
  }
  return power;
}

/**
 * Returns human-readable round name from knockout bracket size.
 */
export function getKnockoutRoundName(knockoutSize: number): string {
  if (knockoutSize === 2) return 'Grand Final';
  if (knockoutSize === 4) return 'Semi Finals';
  if (knockoutSize === 8) return 'Quarter Finals';
  if (knockoutSize > 8 && isPowerOfTwo(knockoutSize)) return `Round of ${knockoutSize}`;
  return 'Knockout Stage';
}

export interface GroupSizeDetail {
  groupName: string;
  order: number;
  count: number;
}

/**
 * Calculates even distribution of teams across groups.
 * Ensures maxGroupSize - minGroupSize <= 1.
 */
export function calculateGroupDistributionSizes(totalTeams: number, numberOfGroups: number): GroupSizeDetail[] {
  if (numberOfGroups <= 0 || totalTeams <= 0) return [];
  const baseSize = Math.floor(totalTeams / numberOfGroups);
  const remainder = totalTeams % numberOfGroups;
  const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const result: GroupSizeDetail[] = [];
  for (let g = 0; g < numberOfGroups; g++) {
    const groupName = `Group ${groupLetters[g] || g + 1}`;
    const count = baseSize + (g < remainder ? 1 : 0);
    result.push({
      groupName,
      order: g + 1,
      count,
    });
  }
  return result;
}

export interface GroupKnockoutValidationResult {
  valid: boolean;
  totalTeams: number;
  numberOfGroups: number;
  qualifiersPerGroup: number;
  qualifiedTeams: number;
  knockoutRoundName: string;
  groupDistribution: GroupSizeDetail[];
  minGroupSize: number;
  maxGroupSize: number;
  error?: string;
  suggestions?: ValidConfigSuggestion[];
}

export interface ValidConfigSuggestion {
  numberOfGroups: number;
  qualifiersPerGroup: number;
  qualifiedTeams: number;
  knockoutRoundName: string;
  groupDistributionText: string;
}

/**
 * Validates Group Stage + Knockout settings for a given team count.
 */
export function validateGroupKnockoutConfig(
  totalTeams: number,
  numberOfGroups: number,
  qualifiersPerGroup: number
): GroupKnockoutValidationResult {
  const distribution = calculateGroupDistributionSizes(totalTeams, numberOfGroups);
  const counts = distribution.map((d) => d.count);
  const minGroupSize = counts.length > 0 ? Math.min(...counts) : 0;
  const maxGroupSize = counts.length > 0 ? Math.max(...counts) : 0;
  const qualifiedTeams = numberOfGroups * qualifiersPerGroup;
  const knockoutRoundName = getKnockoutRoundName(qualifiedTeams);

  if (totalTeams < 2) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `At least 2 teams are required to create a tournament.`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (numberOfGroups <= 0) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `Number of groups must be at least 1.`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (numberOfGroups > totalTeams) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `Number of groups (${numberOfGroups}) cannot exceed total teams (${totalTeams}).`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (qualifiersPerGroup <= 0) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `Qualifiers per group must be at least 1.`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (qualifiersPerGroup > minGroupSize) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `Qualifiers per group (${qualifiersPerGroup}) cannot exceed smallest group size (${minGroupSize}).`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (maxGroupSize - minGroupSize > 1) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `Group distribution is invalid. Groups must differ by no more than 1 team.`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  if (!isPowerOfTwo(qualifiedTeams)) {
    return {
      valid: false,
      totalTeams,
      numberOfGroups,
      qualifiersPerGroup,
      qualifiedTeams,
      knockoutRoundName,
      groupDistribution: distribution,
      minGroupSize,
      maxGroupSize,
      error: `${qualifiedTeams} teams would qualify for the knockout stage. A standard knockout bracket requires 4, 8, 16, 32, 64... qualified teams. Please change the number of groups or qualifiers per group.`,
      suggestions: suggestValidGroupConfigs(totalTeams),
    };
  }

  return {
    valid: true,
    totalTeams,
    numberOfGroups,
    qualifiersPerGroup,
    qualifiedTeams,
    knockoutRoundName,
    groupDistribution: distribution,
    minGroupSize,
    maxGroupSize,
  };
}

/**
 * Suggests valid group + qualification configurations for a given total team count.
 */
export function suggestValidGroupConfigs(totalTeams: number): ValidConfigSuggestion[] {
  if (totalTeams < 4) return [];

  const suggestions: ValidConfigSuggestion[] = [];
  const maxGroups = Math.min(totalTeams, 32);

  for (let g = 2; g <= maxGroups; g++) {
    const dist = calculateGroupDistributionSizes(totalTeams, g);
    const minGSize = Math.min(...dist.map((d) => d.count));

    for (let q = 1; q <= minGSize; q++) {
      const qualified = g * q;
      if (isPowerOfTwo(qualified) && qualified >= 4) {
        const countsStr = dist.map((d) => d.count).join(' / ');
        suggestions.push({
          numberOfGroups: g,
          qualifiersPerGroup: q,
          qualifiedTeams: qualified,
          knockoutRoundName: getKnockoutRoundName(qualified),
          groupDistributionText: `${g} groups (${countsStr})`,
        });
      }
    }
  }

  // Deduplicate and limit to top 6 options
  const unique = new Map<string, ValidConfigSuggestion>();
  for (const s of suggestions) {
    const key = `${s.numberOfGroups}-${s.qualifiersPerGroup}`;
    if (!unique.has(key)) unique.set(key, s);
  }

  return Array.from(unique.values()).slice(0, 6);
}

