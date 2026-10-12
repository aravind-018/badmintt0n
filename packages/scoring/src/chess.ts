// =============================================================================
// Chess Scoring Engine — Clocks, Turns, Results, Swiss & Tie-break Calculation
// =============================================================================

export type ChessColor = 'WHITE' | 'BLACK';

export type ChessResult =
  | '1-0' // White wins
  | '0-1' // Black wins
  | '1/2-1/2' // Draw
  | 'IN_PROGRESS';

export type ChessTermination =
  | 'CHECKMATE'
  | 'RESIGNATION'
  | 'TIMEOUT'
  | 'AGREEMENT'
  | 'STALEMATE'
  | 'THREEFOLD_REPETITION'
  | 'FIFTY_MOVE_RULE'
  | 'INSUFFICIENT_MATERIAL'
  | 'DEFAULT';

export interface ChessMoveRecord {
  moveNumber: number;
  color: ChessColor;
  san?: string; // Standard Algebraic Notation (e.g. "e4", "Nf3", "O-O")
  timeRemainingSeconds: number;
  timestamp: string;
}

export interface ChessEvent {
  id: string;
  matchId: string;
  type:
    | 'MOVE_MADE'
    | 'CLOCK_TICK'
    | 'DRAW_OFFERED'
    | 'RESIGNATION'
    | 'TIME_OUT'
    | 'AGREE_DRAW'
    | 'CHECKMATE'
    | 'PAUSE'
    | 'RESUME'
    | 'UNDO';
  timestamp: string;
  createdBy: string;
  color?: ChessColor;
  san?: string;
  remainingWhiteSeconds?: number;
  remainingBlackSeconds?: number;
  requestId?: string;
}

export interface ChessMetadata {
  sideAName?: string;
  sideBName?: string;
  initialTimeMinutes?: number; // e.g. 15
  incrementSeconds?: number; // e.g. 10
  sideAColor?: ChessColor; // default WHITE
}

export interface ChessMatchState {
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  initialTimeMinutes: number;
  incrementSeconds: number;
  whiteTimeRemainingSeconds: number;
  blackTimeRemainingSeconds: number;
  activeColor: ChessColor;
  moves: ChessMoveRecord[];
  totalMovesCount: number;
  drawOfferedBy?: ChessColor;
  result: ChessResult;
  termination?: ChessTermination;
  isMatchComplete: boolean;
  winner?: 'A' | 'B' | 'DRAW';
  sideAPoints: number; // 1 for win, 0.5 for draw, 0 for loss
  sideBPoints: number;
  resultDescription: string;
  events: ChessEvent[];
}

export function createInitialChessState(metadata: ChessMetadata = {}): ChessMatchState {
  const initialTimeMinutes = metadata.initialTimeMinutes || 15;
  const incrementSeconds = metadata.incrementSeconds || 10;
  const initialSeconds = initialTimeMinutes * 60;

  return {
    status: 'SCHEDULED',
    initialTimeMinutes,
    incrementSeconds,
    whiteTimeRemainingSeconds: initialSeconds,
    blackTimeRemainingSeconds: initialSeconds,
    activeColor: 'WHITE',
    moves: [],
    totalMovesCount: 0,
    result: 'IN_PROGRESS',
    isMatchComplete: false,
    sideAPoints: 0.5,
    sideBPoints: 0.5,
    resultDescription: '* - *',
    events: [],
  };
}

export function applyChessEvent(
  state: ChessMatchState,
  event: ChessEvent,
  metadata: ChessMetadata = {}
): ChessMatchState {
  if (event.type === 'UNDO') {
    const historical = state.events.filter((e) => e.type !== 'UNDO');
    if (historical.length === 0) return createInitialChessState(metadata);
    return replayChessEvents(historical.slice(0, historical.length - 1), metadata);
  }

  const nextState: ChessMatchState = JSON.parse(JSON.stringify(state));
  nextState.events.push(event);

  if (event.remainingWhiteSeconds !== undefined) {
    nextState.whiteTimeRemainingSeconds = event.remainingWhiteSeconds;
  }
  if (event.remainingBlackSeconds !== undefined) {
    nextState.blackTimeRemainingSeconds = event.remainingBlackSeconds;
  }

  const sideAIsWhite = (metadata.sideAColor || 'WHITE') === 'WHITE';

  if (event.type === 'MOVE_MADE') {
    nextState.status = 'LIVE';
    const moveColor = event.color || nextState.activeColor;
    const moveNum = Math.floor(nextState.moves.length / 2) + 1;

    // Apply Fischer increment to player who just moved
    if (moveColor === 'WHITE') {
      nextState.whiteTimeRemainingSeconds += nextState.incrementSeconds;
      nextState.activeColor = 'BLACK';
    } else {
      nextState.blackTimeRemainingSeconds += nextState.incrementSeconds;
      nextState.activeColor = 'WHITE';
    }

    nextState.moves.push({
      moveNumber: moveNum,
      color: moveColor,
      san: event.san || `Move ${nextState.moves.length + 1}`,
      timeRemainingSeconds:
        moveColor === 'WHITE'
          ? nextState.whiteTimeRemainingSeconds
          : nextState.blackTimeRemainingSeconds,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    nextState.totalMovesCount = nextState.moves.length;
    nextState.drawOfferedBy = undefined;
  } else if (event.type === 'DRAW_OFFERED' && event.color) {
    nextState.drawOfferedBy = event.color;
  } else if (event.type === 'AGREE_DRAW') {
    nextState.isMatchComplete = true;
    nextState.status = 'COMPLETED';
    nextState.result = '1/2-1/2';
    nextState.termination = 'AGREEMENT';
    nextState.winner = 'DRAW';
    nextState.sideAPoints = 0.5;
    nextState.sideBPoints = 0.5;
    nextState.resultDescription = 'Draw by mutual agreement (½ - ½)';
  } else if (event.type === 'RESIGNATION' && event.color) {
    nextState.isMatchComplete = true;
    nextState.status = 'COMPLETED';
    nextState.termination = 'RESIGNATION';

    if (event.color === 'WHITE') {
      nextState.result = '0-1';
      nextState.winner = sideAIsWhite ? 'B' : 'A';
      nextState.resultDescription = 'Black wins by resignation (0 - 1)';
    } else {
      nextState.result = '1-0';
      nextState.winner = sideAIsWhite ? 'A' : 'B';
      nextState.resultDescription = 'White wins by resignation (1 - 0)';
    }
  } else if (event.type === 'TIME_OUT' && event.color) {
    nextState.isMatchComplete = true;
    nextState.status = 'COMPLETED';
    nextState.termination = 'TIMEOUT';

    if (event.color === 'WHITE') {
      nextState.result = '0-1';
      nextState.winner = sideAIsWhite ? 'B' : 'A';
      nextState.resultDescription = 'Black wins on time (0 - 1)';
    } else {
      nextState.result = '1-0';
      nextState.winner = sideAIsWhite ? 'A' : 'B';
      nextState.resultDescription = 'White wins on time (1 - 0)';
    }
  } else if (event.type === 'CHECKMATE' && event.color) {
    nextState.isMatchComplete = true;
    nextState.status = 'COMPLETED';
    nextState.termination = 'CHECKMATE';

    // The player who delivered checkmate wins
    if (event.color === 'WHITE') {
      nextState.result = '1-0';
      nextState.winner = sideAIsWhite ? 'A' : 'B';
      nextState.resultDescription = 'White wins by checkmate (1 - 0)';
    } else {
      nextState.result = '0-1';
      nextState.winner = sideAIsWhite ? 'B' : 'A';
      nextState.resultDescription = 'Black wins by checkmate (0 - 1)';
    }
  } else if (event.type === 'PAUSE') {
    nextState.status = 'PAUSED';
  } else if (event.type === 'RESUME') {
    nextState.status = 'LIVE';
  }

  // Update Points
  if (nextState.result === '1-0') {
    nextState.sideAPoints = sideAIsWhite ? 1 : 0;
    nextState.sideBPoints = sideAIsWhite ? 0 : 1;
  } else if (nextState.result === '0-1') {
    nextState.sideAPoints = sideAIsWhite ? 0 : 1;
    nextState.sideBPoints = sideAIsWhite ? 1 : 0;
  } else if (nextState.result === '1/2-1/2') {
    nextState.sideAPoints = 0.5;
    nextState.sideBPoints = 0.5;
  }

  return nextState;
}

export function replayChessEvents(events: ChessEvent[], metadata: ChessMetadata = {}): ChessMatchState {
  let state = createInitialChessState(metadata);
  for (const event of events) {
    state = applyChessEvent(state, event, metadata);
  }
  return state;
}

/**
 * Calculates Sonneborn-Berger tie-break score for Chess Swiss/Round-robin
 */
export function calculateSonnebornBerger(
  playerId: string,
  matches: Array<{ playerAId: string; playerBId: string; result: '1-0' | '0-1' | '1/2-1/2' }>,
  playerFinalPoints: Record<string, number>
): number {
  let sb = 0;
  for (const m of matches) {
    if (m.playerAId === playerId) {
      const oppPts = playerFinalPoints[m.playerBId] || 0;
      if (m.result === '1-0') sb += oppPts;
      else if (m.result === '1/2-1/2') sb += oppPts * 0.5;
    } else if (m.playerBId === playerId) {
      const oppPts = playerFinalPoints[m.playerAId] || 0;
      if (m.result === '0-1') sb += oppPts;
      else if (m.result === '1/2-1/2') sb += oppPts * 0.5;
    }
  }
  return sb;
}
