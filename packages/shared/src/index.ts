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
