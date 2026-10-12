// =============================================================================
// Carrom Scoring Engine — Boards, White/Black Coins, Queen & Cover, Penalties
// =============================================================================

export interface CarromBoardResult {
  boardNumber: number;
  winner: 'A' | 'B';
  winnerPoints: number; // Opponent coins remaining + Queen bonus
  queenCoveredBy?: 'A' | 'B';
  whiteCoinsPocketedA: number;
  blackCoinsPocketedB: number;
  penaltiesA: number;
  penaltiesB: number;
  cumulativeScoreA: number;
  cumulativeScoreB: number;
  isComplete: boolean;
}

export interface CarromEvent {
  id: string;
  matchId: string;
  type:
    | 'COIN_POCKETED'
    | 'QUEEN_POCKETED'
    | 'QUEEN_COVERED'
    | 'FOUL_PENALTY'
    | 'BOARD_COMPLETE'
    | 'UNDO';
  timestamp: string;
  createdBy: string;
  boardNumber?: number;
  side?: 'A' | 'B';
  coinColor?: 'WHITE' | 'BLACK';
  penaltyCoins?: number;
  requestId?: string;
}

export interface CarromMetadata {
  isDoubles?: boolean;
  sideAName?: string;
  sideBName?: string;
  targetPoints?: number; // Standard: 25 points
  maxBoards?: number; // Standard: 8 boards
  queenValue?: number; // Standard: 3 points
}

export interface CarromMatchState {
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  isDoubles: boolean;
  targetPoints: number;
  maxBoards: number;
  queenValue: number;
  currentBoardNumber: number;
  sideATotalPoints: number;
  sideBTotalPoints: number;
  currentBoard: {
    boardNumber: number;
    whiteCoinsPocketedA: number;
    blackCoinsPocketedB: number;
    queenPocketedBy?: 'A' | 'B';
    queenCoveredBy?: 'A' | 'B';
    penaltiesA: number;
    penaltiesB: number;
    isComplete: boolean;
  };
  completedBoards: CarromBoardResult[];
  isMatchComplete: boolean;
  winner?: 'A' | 'B';
  resultDescription: string;
  events: CarromEvent[];
}

export function createInitialCarromState(metadata: CarromMetadata = {}): CarromMatchState {
  const targetPoints = metadata.targetPoints || 25;
  const maxBoards = metadata.maxBoards || 8;
  const queenValue = metadata.queenValue || 3;
  const isDoubles = !!metadata.isDoubles;

  return {
    status: 'SCHEDULED',
    isDoubles,
    targetPoints,
    maxBoards,
    queenValue,
    currentBoardNumber: 1,
    sideATotalPoints: 0,
    sideBTotalPoints: 0,
    currentBoard: {
      boardNumber: 1,
      whiteCoinsPocketedA: 0,
      blackCoinsPocketedB: 0,
      penaltiesA: 0,
      penaltiesB: 0,
      isComplete: false,
    },
    completedBoards: [],
    isMatchComplete: false,
    resultDescription: '0 - 0',
    events: [],
  };
}

export function applyCarromEvent(
  state: CarromMatchState,
  event: CarromEvent,
  metadata: CarromMetadata = {}
): CarromMatchState {
  if (event.type === 'UNDO') {
    const historical = state.events.filter((e) => e.type !== 'UNDO');
    if (historical.length === 0) return createInitialCarromState(metadata);
    return replayCarromEvents(historical.slice(0, historical.length - 1), metadata);
  }

  const nextState: CarromMatchState = JSON.parse(JSON.stringify(state));
  nextState.events.push(event);
  nextState.status = 'LIVE';

  const board = nextState.currentBoard;

  if (event.type === 'COIN_POCKETED' && event.side) {
    if (event.side === 'A') {
      board.whiteCoinsPocketedA = Math.min(9, board.whiteCoinsPocketedA + 1);
    } else {
      board.blackCoinsPocketedB = Math.min(9, board.blackCoinsPocketedB + 1);
    }
  } else if (event.type === 'QUEEN_POCKETED' && event.side) {
    board.queenPocketedBy = event.side;
  } else if (event.type === 'QUEEN_COVERED' && event.side) {
    if (board.queenPocketedBy === event.side) {
      board.queenCoveredBy = event.side;
    }
  } else if (event.type === 'FOUL_PENALTY' && event.side) {
    if (event.side === 'A') {
      board.penaltiesA += event.penaltyCoins || 1;
    } else {
      board.penaltiesB += event.penaltyCoins || 1;
    }
  } else if (event.type === 'BOARD_COMPLETE' && event.side) {
    const boardWinner = event.side;
    let pointsAwarded = 0;

    // Under International Carrom Federation rules:
    // Winner receives 1 point per opponent's coin left on board.
    // If winner has also covered Queen, they receive Queen value (3 points) provided winner's score is < 22.
    const loserCoinsLeft = boardWinner === 'A' ? 9 - board.blackCoinsPocketedB : 9 - board.whiteCoinsPocketedA;
    pointsAwarded += Math.max(0, loserCoinsLeft);

    const winnerScoreBeforeBoard = boardWinner === 'A' ? nextState.sideATotalPoints : nextState.sideBTotalPoints;
    if (board.queenCoveredBy === boardWinner && winnerScoreBeforeBoard < 22) {
      pointsAwarded += nextState.queenValue;
    }

    if (boardWinner === 'A') {
      nextState.sideATotalPoints += pointsAwarded;
    } else {
      nextState.sideBTotalPoints += pointsAwarded;
    }

    const completedBoard: CarromBoardResult = {
      boardNumber: nextState.currentBoardNumber,
      winner: boardWinner,
      winnerPoints: pointsAwarded,
      queenCoveredBy: board.queenCoveredBy,
      whiteCoinsPocketedA: board.whiteCoinsPocketedA,
      blackCoinsPocketedB: board.blackCoinsPocketedB,
      penaltiesA: board.penaltiesA,
      penaltiesB: board.penaltiesB,
      cumulativeScoreA: nextState.sideATotalPoints,
      cumulativeScoreB: nextState.sideBTotalPoints,
      isComplete: true,
    };
    nextState.completedBoards.push(completedBoard);

    // Check Match victory
    if (
      nextState.sideATotalPoints >= nextState.targetPoints ||
      nextState.sideBTotalPoints >= nextState.targetPoints ||
      nextState.currentBoardNumber >= nextState.maxBoards
    ) {
      nextState.isMatchComplete = true;
      nextState.status = 'COMPLETED';

      if (nextState.sideATotalPoints > nextState.sideBTotalPoints) {
        nextState.winner = 'A';
        nextState.resultDescription = `${metadata.sideAName || 'Side A'} won (${nextState.sideATotalPoints} - ${nextState.sideBTotalPoints})`;
      } else if (nextState.sideBTotalPoints > nextState.sideATotalPoints) {
        nextState.winner = 'B';
        nextState.resultDescription = `${metadata.sideBName || 'Side B'} won (${nextState.sideBTotalPoints} - ${nextState.sideATotalPoints})`;
      } else {
        nextState.resultDescription = `Match Tied (${nextState.sideATotalPoints} - ${nextState.sideBTotalPoints})`;
      }
    } else {
      // Advance to next board
      nextState.currentBoardNumber += 1;
      nextState.currentBoard = {
        boardNumber: nextState.currentBoardNumber,
        whiteCoinsPocketedA: 0,
        blackCoinsPocketedB: 0,
        penaltiesA: 0,
        penaltiesB: 0,
        isComplete: false,
      };
      nextState.resultDescription = `${nextState.sideATotalPoints} - ${nextState.sideBTotalPoints}`;
    }
  }

  nextState.resultDescription = `${nextState.sideATotalPoints} - ${nextState.sideBTotalPoints}`;
  return nextState;
}

export function replayCarromEvents(events: CarromEvent[], metadata: CarromMetadata = {}): CarromMatchState {
  let state = createInitialCarromState(metadata);
  for (const event of events) {
    state = applyCarromEvent(state, event, metadata);
  }
  return state;
}
