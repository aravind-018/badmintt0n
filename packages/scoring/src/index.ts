// =============================================================================
// Badminton Scoring Engine — Pure TypeScript BWF Rules Engine
// =============================================================================

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

export type MatchEventType =
  | 'POINT_SIDE_A'
  | 'POINT_SIDE_B'
  | 'UNDO'
  | 'PAUSE'
  | 'RESUME'
  | 'WALKOVER'
  | 'RETIRE'
  | 'COMPLETE';

export interface MatchEvent {
  id: string;
  matchId: string;
  gameNumber: number;
  type: MatchEventType;
  timestamp: string;
  createdBy: string;
  requestId?: string;
}

export interface GameState {
  gameNumber: number;
  sideAPoints: number;
  sideBPoints: number;
  isComplete: boolean;
  winner?: 'A' | 'B';
  isDeuce: boolean;
}

export interface MatchState {
  status: MatchStatus;
  currentGameNumber: number;
  games: GameState[];
  sideAGamesWon: number;
  sideBGamesWon: number;
  isMatchComplete: boolean;
  winner?: 'A' | 'B';
  events: MatchEvent[];
}

export function createInitialMatchState(): MatchState {
  return {
    status: 'SCHEDULED',
    currentGameNumber: 1,
    games: [
      {
        gameNumber: 1,
        sideAPoints: 0,
        sideBPoints: 0,
        isComplete: false,
        isDeuce: false,
      },
    ],
    sideAGamesWon: 0,
    sideBGamesWon: 0,
    isMatchComplete: false,
    events: [],
  };
}

/**
 * Evaluates whether a game has been won according to BWF Rules:
 * 1. Reach 21 points with a minimum 2-point lead.
 * 2. At 20-20 (deuce), a 2-point lead is required (e.g., 22-20, 24-22).
 * 3. At 29-29, the 30th point wins immediately (max cap of 30).
 */
export function evaluateGameScore(sideAPoints: number, sideBPoints: number): {
  isComplete: boolean;
  winner?: 'A' | 'B';
  isDeuce: boolean;
} {
  const isDeuce = sideAPoints >= 20 && sideBPoints >= 20 && sideAPoints === sideBPoints;

  // 30 point max cap rule
  if (sideAPoints === 30) {
    return { isComplete: true, winner: 'A', isDeuce: false };
  }
  if (sideBPoints === 30) {
    return { isComplete: true, winner: 'B', isDeuce: false };
  }

  // Standard 21 win & 2 point lead rule
  if (sideAPoints >= 21 && sideAPoints - sideBPoints >= 2) {
    return { isComplete: true, winner: 'A', isDeuce };
  }
  if (sideBPoints >= 21 && sideBPoints - sideAPoints >= 2) {
    return { isComplete: true, winner: 'B', isDeuce };
  }

  return { isComplete: false, isDeuce };
}

/**
 * Replays an array of point events from start to finish to calculate deterministic state.
 */
export function replayMatchEvents(events: MatchEvent[]): MatchState {
  let state = createInitialMatchState();

  for (const event of events) {
    state = applySingleEvent(state, event);
  }

  return state;
}

/**
 * Applies a single event to the current match state following BWF laws.
 */
function applySingleEvent(state: MatchState, event: MatchEvent): MatchState {
  const nextEvents = [...state.events, event];

  if (event.type === 'PAUSE') {
    return { ...state, status: 'PAUSED', events: nextEvents };
  }

  if (event.type === 'RESUME') {
    return { ...state, status: 'LIVE', events: nextEvents };
  }

  if (event.type === 'WALKOVER') {
    return {
      ...state,
      status: 'WALKOVER',
      isMatchComplete: true,
      winner: event.createdBy === 'A' ? 'A' : 'B',
      events: nextEvents,
    };
  }

  if (event.type === 'RETIRE') {
    return {
      ...state,
      status: 'RETIRED',
      isMatchComplete: true,
      winner: event.createdBy === 'A' ? 'B' : 'A',
      events: nextEvents,
    };
  }

  if (event.type === 'COMPLETE') {
    return {
      ...state,
      status: 'COMPLETED',
      isMatchComplete: true,
      events: nextEvents,
    };
  }

  if (event.type === 'UNDO') {
    // To undo, filter out the last point event and replay history
    const pointEvents = state.events.filter(
      (e) => e.type === 'POINT_SIDE_A' || e.type === 'POINT_SIDE_B'
    );
    if (pointEvents.length === 0) {
      return state; // Nothing to undo
    }
    const remainingPointEvents = pointEvents.slice(0, pointEvents.length - 1);
    return replayMatchEvents(remainingPointEvents);
  }

  if (event.type === 'POINT_SIDE_A' || event.type === 'POINT_SIDE_B') {
    if (state.isMatchComplete) {
      throw new Error('Cannot add points to a completed match.');
    }

    const currentGames = [...state.games];
    let currGameIdx = state.currentGameNumber - 1;

    if (!currentGames[currGameIdx]) {
      currentGames[currGameIdx] = {
        gameNumber: state.currentGameNumber,
        sideAPoints: 0,
        sideBPoints: 0,
        isComplete: false,
        isDeuce: false,
      };
    }

    const activeGame = { ...currentGames[currGameIdx] };

    if (event.type === 'POINT_SIDE_A') {
      activeGame.sideAPoints += 1;
    } else {
      activeGame.sideBPoints += 1;
    }

    const evalResult = evaluateGameScore(activeGame.sideAPoints, activeGame.sideBPoints);
    activeGame.isComplete = evalResult.isComplete;
    activeGame.winner = evalResult.winner;
    activeGame.isDeuce = evalResult.isDeuce;

    currentGames[currGameIdx] = activeGame;

    let sideAGamesWon = state.sideAGamesWon;
    let sideBGamesWon = state.sideBGamesWon;
    let isMatchComplete = false;
    let matchWinner: 'A' | 'B' | undefined = undefined;
    let nextGameNum = state.currentGameNumber;

    if (activeGame.isComplete) {
      if (activeGame.winner === 'A') sideAGamesWon += 1;
      if (activeGame.winner === 'B') sideBGamesWon += 1;

      if (sideAGamesWon === 2) {
        isMatchComplete = true;
        matchWinner = 'A';
      } else if (sideBGamesWon === 2) {
        isMatchComplete = true;
        matchWinner = 'B';
      } else {
        // Transition to next game (Best of 3)
        nextGameNum += 1;
        currentGames.push({
          gameNumber: nextGameNum,
          sideAPoints: 0,
          sideBPoints: 0,
          isComplete: false,
          isDeuce: false,
        });
      }
    }

    return {
      status: isMatchComplete ? 'COMPLETED' : 'LIVE',
      currentGameNumber: nextGameNum,
      games: currentGames,
      sideAGamesWon,
      sideBGamesWon,
      isMatchComplete,
      winner: matchWinner,
      events: nextEvents,
    };
  }

  return state;
}
