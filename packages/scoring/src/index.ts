// =============================================================================
// Premier League Scoring Engine — Unified Multi-Sport Rules System
// =============================================================================

import type { SportType } from '@badminton-live/shared';
export type { SportType } from '@badminton-live/shared';

// -----------------------------------------------------------------------------
// 1. Badminton Scoring Engine (Preserved & Re-exported)
// -----------------------------------------------------------------------------
export * from './badminton';
export { replayMatchEvents as replayBadmintonEvents } from './badminton';

// -----------------------------------------------------------------------------
// 2. Cricket Scoring Engine
// -----------------------------------------------------------------------------
export * from './cricket';

// -----------------------------------------------------------------------------
// 3. Football Scoring Engine
// -----------------------------------------------------------------------------
export * from './football';

// -----------------------------------------------------------------------------
// 4. Chess Scoring Engine
// -----------------------------------------------------------------------------
export * from './chess';

// -----------------------------------------------------------------------------
// 5. Carrom Scoring Engine
// -----------------------------------------------------------------------------
export * from './carrom';

// -----------------------------------------------------------------------------
// Unified Multi-Sport Dispatcher
// -----------------------------------------------------------------------------
import {
  replayMatchEvents as replayBadmintonEvents,
  createInitialMatchState as createInitialBadmintonState,
  applySingleEvent as applyBadmintonEvent,
  MatchState as BadmintonMatchState,
} from './badminton';
import {
  replayCricketEvents,
  createInitialCricketState,
  applyCricketEvent,
  CricketMatchState,
} from './cricket';
import {
  replayFootballEvents,
  createInitialFootballState,
  applyFootballEvent,
  FootballMatchState,
} from './football';
import {
  replayChessEvents,
  createInitialChessState,
  applyChessEvent,
  ChessMatchState,
} from './chess';
import {
  replayCarromEvents,
  createInitialCarromState,
  applyCarromEvent,
  CarromMatchState,
} from './carrom';

export type AnySportMatchState =
  | BadmintonMatchState
  | CricketMatchState
  | FootballMatchState
  | ChessMatchState
  | CarromMatchState;

export function createInitialSportMatchState(
  sport: SportType = 'BADMINTON',
  metadata: any = {}
): AnySportMatchState {
  switch (sport) {
    case 'CRICKET':
      return createInitialCricketState(metadata);
    case 'FOOTBALL':
      return createInitialFootballState(metadata);
    case 'CHESS':
      return createInitialChessState(metadata);
    case 'CARROM':
      return createInitialCarromState(metadata);
    case 'BADMINTON':
    default:
      return createInitialBadmintonState(metadata.targetPoints || 21, metadata);
  }
}

export function replaySportMatchEvents(
  sport: SportType = 'BADMINTON',
  events: any[] = [],
  metadata: any = {}
): AnySportMatchState {
  switch (sport) {
    case 'CRICKET':
      return replayCricketEvents(events, metadata);
    case 'FOOTBALL':
      return replayFootballEvents(events, metadata);
    case 'CHESS':
      return replayChessEvents(events, metadata);
    case 'CARROM':
      return replayCarromEvents(events, metadata);
    case 'BADMINTON':
    default:
      return replayBadmintonEvents(events, metadata.targetPoints || 21, metadata);
  }
}

export function applySportMatchEvent(
  sport: SportType = 'BADMINTON',
  currentState: AnySportMatchState,
  event: any,
  metadata: any = {}
): AnySportMatchState {
  switch (sport) {
    case 'CRICKET':
      return applyCricketEvent(currentState as CricketMatchState, event, metadata);
    case 'FOOTBALL':
      return applyFootballEvent(currentState as FootballMatchState, event, metadata);
    case 'CHESS':
      return applyChessEvent(currentState as ChessMatchState, event, metadata);
    case 'CARROM':
      return applyCarromEvent(currentState as CarromMatchState, event, metadata);
    case 'BADMINTON':
    default:
      return applyBadmintonEvent(
        currentState as BadmintonMatchState,
        event,
        metadata.targetPoints || 21,
        metadata
      );
  }
}

export interface SportScoreSummary {
  sideAScoreDisplay: string;
  sideBScoreDisplay: string;
  status: string;
  isComplete: boolean;
  winner?: 'A' | 'B' | string;
  description: string;
}

export function extractSportScoreSummary(
  sport: SportType = 'BADMINTON',
  state: AnySportMatchState
): SportScoreSummary {
  switch (sport) {
    case 'CRICKET': {
      const cr = state as CricketMatchState;
      return {
        sideAScoreDisplay: cr.sideAScoreText,
        sideBScoreDisplay: cr.sideBScoreText,
        status: cr.status,
        isComplete: cr.isMatchComplete,
        winner: cr.winner,
        description: cr.resultDescription || `${cr.sideAScoreText} vs ${cr.sideBScoreText}`,
      };
    }
    case 'FOOTBALL': {
      const fb = state as FootballMatchState;
      return {
        sideAScoreDisplay: fb.sideAGoals.toString(),
        sideBScoreDisplay: fb.sideBGoals.toString(),
        status: fb.status,
        isComplete: fb.isMatchComplete,
        winner: fb.winner,
        description: fb.resultDescription,
      };
    }
    case 'CHESS': {
      const ch = state as ChessMatchState;
      return {
        sideAScoreDisplay: ch.sideAPoints.toString(),
        sideBScoreDisplay: ch.sideBPoints.toString(),
        status: ch.status,
        isComplete: ch.isMatchComplete,
        winner: ch.winner,
        description: ch.resultDescription,
      };
    }
    case 'CARROM': {
      const ca = state as CarromMatchState;
      return {
        sideAScoreDisplay: ca.sideATotalPoints.toString(),
        sideBScoreDisplay: ca.sideBTotalPoints.toString(),
        status: ca.status,
        isComplete: ca.isMatchComplete,
        winner: ca.winner,
        description: ca.resultDescription,
      };
    }
    case 'BADMINTON':
    default: {
      const bm = state as BadmintonMatchState;
      const currentGame = bm.games[bm.currentGameNumber - 1];
      const gameScores = bm.games
        .filter((g) => g.isComplete || g.sideAPoints > 0 || g.sideBPoints > 0)
        .map((g) => `${g.sideAPoints}-${g.sideBPoints}`)
        .join(', ');
      return {
        sideAScoreDisplay: currentGame ? currentGame.sideAPoints.toString() : '0',
        sideBScoreDisplay: currentGame ? currentGame.sideBPoints.toString() : '0',
        status: bm.status,
        isComplete: bm.isMatchComplete,
        winner: bm.winner,
        description: gameScores || '0-0',
      };
    }
  }
}
