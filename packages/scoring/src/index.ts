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

export interface PlayerPosition {
  name: string;
  position: 'RIGHT' | 'LEFT';
}

export interface ServingState {
  servingSide: 'A' | 'B';
  servingTeamName: string;
  serverName: string;
  receiverName: string;
  serviceCourt: 'RIGHT' | 'LEFT';
  sideAPlayers: PlayerPosition[];
  sideBPlayers: PlayerPosition[];
}

export interface MatchMetadata {
  isDoubles?: boolean;
  sideAName?: string;
  sideBName?: string;
  initialServingSide?: 'A' | 'B';
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
  targetPoints: number;
  servingState: ServingState;
}

export function parsePlayers(
  name: string | undefined,
  isDoubles: boolean,
  defaultSideLabel: string
): PlayerPosition[] {
  const raw = (name || defaultSideLabel).trim();
  if (isDoubles) {
    const cleaned = raw.replace(/\s*\([^)]*\)\s*$/, '');
    const parts = cleaned.split(/\s*[\/\&,]\s*/).filter(Boolean);
    if (parts.length >= 2) {
      return [
        { name: parts[0], position: 'RIGHT' },
        { name: parts[1], position: 'LEFT' },
      ];
    } else if (parts.length === 1) {
      return [
        { name: parts[0], position: 'RIGHT' },
        { name: `${parts[0]} (Partner)`, position: 'LEFT' },
      ];
    }
  }
  return [{ name: raw, position: 'RIGHT' }];
}

export function computeInitialServingState(
  metadata: MatchMetadata = {}
): ServingState {
  const isDoubles = !!metadata.isDoubles;
  const sideAName = metadata.sideAName || 'Side A';
  const sideBName = metadata.sideBName || 'Side B';
  const servingSide = metadata.initialServingSide || 'A';

  const sideAPlayers = parsePlayers(sideAName, isDoubles, 'Side A');
  const sideBPlayers = parsePlayers(sideBName, isDoubles, 'Side B');

  const serviceCourt: 'RIGHT' | 'LEFT' = 'RIGHT'; // Score 0 is EVEN -> RIGHT court

  const servingPlayers = servingSide === 'A' ? sideAPlayers : sideBPlayers;
  const receivingPlayers = servingSide === 'A' ? sideBPlayers : sideAPlayers;

  const server =
    servingPlayers.find((p) => p.position === serviceCourt) || servingPlayers[0];
  const receiver =
    receivingPlayers.find((p) => p.position === serviceCourt) || receivingPlayers[0];

  return {
    servingSide,
    servingTeamName: servingSide === 'A' ? sideAName : sideBName,
    serverName: server?.name || (servingSide === 'A' ? sideAName : sideBName),
    receiverName: receiver?.name || (servingSide === 'A' ? sideBName : sideAName),
    serviceCourt,
    sideAPlayers,
    sideBPlayers,
  };
}

export function createInitialMatchState(
  targetPoints: number = 21,
  metadata: MatchMetadata = {}
): MatchState {
  const servingState = computeInitialServingState(metadata);

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
    targetPoints,
    servingState,
  };
}

/**
 * Evaluates whether a game has been won according to BWF Rules:
 * 1. Reach targetPoints (default 21) with a minimum 2-point lead.
 * 2. At (targetPoints - 1) - (targetPoints - 1), a 2-point lead is required.
 * 3. At capPoints (e.g. 15 for 11, 21 for 15, 30 for 21), max point cap wins immediately.
 */
export function evaluateGameScore(
  sideAPoints: number,
  sideBPoints: number,
  targetPoints: number = 21
): {
  isComplete: boolean;
  winner?: 'A' | 'B';
  isDeuce: boolean;
} {
  const capPoints =
    targetPoints === 11
      ? 15
      : targetPoints === 15
      ? 21
      : targetPoints === 30
      ? 30
      : Math.min(targetPoints + 9, 30);

  const deuceThreshold = Math.max(1, targetPoints - 1);

  const isDeuce =
    sideAPoints >= deuceThreshold && sideBPoints >= deuceThreshold && sideAPoints === sideBPoints;

  // Max cap rule
  if (sideAPoints >= capPoints) {
    return { isComplete: true, winner: 'A', isDeuce: false };
  }
  if (sideBPoints >= capPoints) {
    return { isComplete: true, winner: 'B', isDeuce: false };
  }

  // Standard target win & 2 point lead rule
  if (sideAPoints >= targetPoints && sideAPoints - sideBPoints >= 2) {
    return { isComplete: true, winner: 'A', isDeuce };
  }
  if (sideBPoints >= targetPoints && sideBPoints - sideAPoints >= 2) {
    return { isComplete: true, winner: 'B', isDeuce };
  }

  return { isComplete: false, isDeuce };
}

/**
 * Updates ServingState after a rally following BWF Laws.
 */
function updateServingState(
  currentServing: ServingState,
  winnerSide: 'A' | 'B',
  sideAPoints: number,
  sideBPoints: number,
  isDoubles: boolean,
  sideAName: string,
  sideBName: string
): ServingState {
  const servingSide = currentServing.servingSide;
  const isServingSideWinner = winnerSide === servingSide;

  let nextServingSide: 'A' | 'B' = servingSide;
  let nextSideAPlayers = currentServing.sideAPlayers.map((p) => ({ ...p }));
  let nextSideBPlayers = currentServing.sideBPlayers.map((p) => ({ ...p }));

  if (isServingSideWinner) {
    // Serving side retains serve
    nextServingSide = servingSide;

    // In Doubles, the serving side players SWAP court positions
    if (isDoubles) {
      if (servingSide === 'A' && nextSideAPlayers.length >= 2) {
        const temp = nextSideAPlayers[0].position;
        nextSideAPlayers[0].position = nextSideAPlayers[1].position;
        nextSideAPlayers[1].position = temp;
      } else if (servingSide === 'B' && nextSideBPlayers.length >= 2) {
        const temp = nextSideBPlayers[0].position;
        nextSideBPlayers[0].position = nextSideBPlayers[1].position;
        nextSideBPlayers[1].position = temp;
      }
    }
  } else {
    // Side-Out! Receiving side becomes the new serving side. Neither side swaps positions.
    nextServingSide = winnerSide;
  }

  // Calculate Service Court based on new serving side's score
  const newServingScore = nextServingSide === 'A' ? sideAPoints : sideBPoints;
  const nextServiceCourt: 'RIGHT' | 'LEFT' = newServingScore % 2 === 0 ? 'RIGHT' : 'LEFT';

  // Determine Server & Receiver from current court positions
  const nextServingPlayers = nextServingSide === 'A' ? nextSideAPlayers : nextSideBPlayers;
  const nextReceivingPlayers = nextServingSide === 'A' ? nextSideBPlayers : nextSideAPlayers;

  const server =
    nextServingPlayers.find((p) => p.position === nextServiceCourt) || nextServingPlayers[0];
  const receiver =
    nextReceivingPlayers.find((p) => p.position === nextServiceCourt) || nextReceivingPlayers[0];

  return {
    servingSide: nextServingSide,
    servingTeamName: nextServingSide === 'A' ? sideAName : sideBName,
    serverName: server?.name || (nextServingSide === 'A' ? sideAName : sideBName),
    receiverName: receiver?.name || (nextServingSide === 'A' ? sideBName : sideAName),
    serviceCourt: nextServiceCourt,
    sideAPlayers: nextSideAPlayers,
    sideBPlayers: nextSideBPlayers,
  };
}

/**
 * Replays an array of point events from start to finish to calculate deterministic state.
 */
export function replayMatchEvents(
  events: MatchEvent[],
  targetPoints: number = 21,
  metadata: MatchMetadata = {}
): MatchState {
  let state = createInitialMatchState(targetPoints, metadata);

  for (const event of events) {
    state = applySingleEvent(state, event, targetPoints, metadata);
  }

  return state;
}

/**
 * Applies a single event to the current match state following BWF laws.
 */
function applySingleEvent(
  state: MatchState,
  event: MatchEvent,
  targetPoints: number = 21,
  metadata: MatchMetadata = {}
): MatchState {
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
    // To undo, filter out the last point event and replay history deterministically
    const pointEvents = state.events.filter(
      (e) => e.type === 'POINT_SIDE_A' || e.type === 'POINT_SIDE_B'
    );
    if (pointEvents.length === 0) {
      return state; // Nothing to undo
    }
    const remainingPointEvents = pointEvents.slice(0, pointEvents.length - 1);
    return replayMatchEvents(remainingPointEvents, targetPoints, metadata);
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
    const winnerSide: 'A' | 'B' = event.type === 'POINT_SIDE_A' ? 'A' : 'B';

    if (winnerSide === 'A') {
      activeGame.sideAPoints += 1;
    } else {
      activeGame.sideBPoints += 1;
    }

    const evalResult = evaluateGameScore(
      activeGame.sideAPoints,
      activeGame.sideBPoints,
      targetPoints
    );
    activeGame.isComplete = evalResult.isComplete;
    activeGame.winner = evalResult.winner;
    activeGame.isDeuce = evalResult.isDeuce;

    currentGames[currGameIdx] = activeGame;

    let sideAGamesWon = state.sideAGamesWon;
    let sideBGamesWon = state.sideBGamesWon;
    let isMatchComplete = false;
    let matchWinner: 'A' | 'B' | undefined = undefined;
    let nextGameNum = state.currentGameNumber;

    const isDoubles = !!metadata.isDoubles;
    const sideAName = metadata.sideAName || 'Side A';
    const sideBName = metadata.sideBName || 'Side B';

    let nextServingState: ServingState;

    if (activeGame.isComplete) {
      if (activeGame.winner === 'A') sideAGamesWon += 1;
      if (activeGame.winner === 'B') sideBGamesWon += 1;

      if (sideAGamesWon === 2) {
        isMatchComplete = true;
        matchWinner = 'A';
        nextServingState = updateServingState(
          state.servingState,
          winnerSide,
          activeGame.sideAPoints,
          activeGame.sideBPoints,
          isDoubles,
          sideAName,
          sideBName
        );
      } else if (sideBGamesWon === 2) {
        isMatchComplete = true;
        matchWinner = 'B';
        nextServingState = updateServingState(
          state.servingState,
          winnerSide,
          activeGame.sideAPoints,
          activeGame.sideBPoints,
          isDoubles,
          sideAName,
          sideBName
        );
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

        // The winner of the game serves first in the next game
        const gameWinnerSide = activeGame.winner || winnerSide;
        nextServingState = computeInitialServingState({
          isDoubles,
          sideAName,
          sideBName,
          initialServingSide: gameWinnerSide,
        });
      }
    } else {
      nextServingState = updateServingState(
        state.servingState,
        winnerSide,
        activeGame.sideAPoints,
        activeGame.sideBPoints,
        isDoubles,
        sideAName,
        sideBName
      );
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
      targetPoints,
      servingState: nextServingState,
    };
  }

  return state;
}


