// =============================================================================
// Cricket Scoring Engine — Configurable Overs, Innings, Statistics & Rules
// =============================================================================

export interface CricketBatterStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
  bowlerName?: string;
}

export interface CricketBowlerStats {
  id: string;
  name: string;
  overs: number; // e.g. 3.4
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface CricketInningsState {
  inningsNumber: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  legalBallsBowled: number;
  oversCompleted: number; // integer overs
  ballsInCurrentOver: number; // 0 to 5
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
  strikerId?: string;
  strikerName?: string;
  nonStrikerId?: string;
  nonStrikerName?: string;
  currentBowlerId?: string;
  currentBowlerName?: string;
  batters: Record<string, CricketBatterStats>;
  bowlers: Record<string, CricketBowlerStats>;
  recentBalls: string[]; // e.g. ['1', 'Wd', '4', 'W', '0', '6']
  isComplete: boolean;
  closureReason?: 'ALL_OUT' | 'OVERS_EXHAUSTED' | 'TARGET_REACHED' | 'DECLARED';
}

export interface CricketMetadata {
  maxOvers?: number; // default 20
  sideAId?: string;
  sideAName?: string;
  sideBId?: string;
  sideBName?: string;
  battingFirst?: 'A' | 'B';
}

export interface CricketEvent {
  id: string;
  matchId: string;
  type:
    | 'BALL_BOWLED'
    | 'WICKET'
    | 'EXTRA'
    | 'INNINGS_END'
    | 'STRIKE_ROTATE'
    | 'NEW_BATTER'
    | 'NEW_BOWLER'
    | 'UNDO';
  timestamp: string;
  createdBy: string;
  runs?: number; // batsman runs (0, 1, 2, 3, 4, 6)
  extraType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';
  extraRuns?: number;
  isWicket?: boolean;
  wicketType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED';
  dismissedPlayerId?: string;
  newBatterId?: string;
  newBatterName?: string;
  bowlerId?: string;
  bowlerName?: string;
  requestId?: string;
}

export interface CricketMatchState {
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  maxOvers: number;
  currentInningsNumber: 1 | 2;
  innings1: CricketInningsState;
  innings2?: CricketInningsState;
  target?: number;
  requiredRunRate?: number;
  currentRunRate: number;
  isMatchComplete: boolean;
  winner?: 'A' | 'B' | 'TIE' | 'NO_RESULT';
  resultDescription?: string;
  sideAScoreText: string; // e.g. "145/6 (20.0)"
  sideBScoreText: string;
  events: CricketEvent[];
}

export function createInitialCricketInnings(
  inningsNumber: 1 | 2,
  battingTeamId: string,
  battingTeamName: string,
  bowlingTeamId: string,
  bowlingTeamName: string
): CricketInningsState {
  return {
    inningsNumber,
    battingTeamId,
    battingTeamName,
    bowlingTeamId,
    bowlingTeamName,
    totalRuns: 0,
    wickets: 0,
    legalBallsBowled: 0,
    oversCompleted: 0,
    ballsInCurrentOver: 0,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
      total: 0,
    },
    batters: {},
    bowlers: {},
    recentBalls: [],
    isComplete: false,
  };
}

export function createInitialCricketState(metadata: CricketMetadata = {}): CricketMatchState {
  const maxOvers = metadata.maxOvers || 20;
  const battingFirst = metadata.battingFirst || 'A';
  const sideAId = metadata.sideAId || 'teamA';
  const sideAName = metadata.sideAName || 'Team A';
  const sideBId = metadata.sideBId || 'teamB';
  const sideBName = metadata.sideBName || 'Team B';

  const innings1BattingId = battingFirst === 'A' ? sideAId : sideBId;
  const innings1BattingName = battingFirst === 'A' ? sideAName : sideBName;
  const innings1BowlingId = battingFirst === 'A' ? sideBId : sideAId;
  const innings1BowlingName = battingFirst === 'A' ? sideBName : sideAName;

  const innings1 = createInitialCricketInnings(
    1,
    innings1BattingId,
    innings1BattingName,
    innings1BowlingId,
    innings1BowlingName
  );

  return {
    status: 'SCHEDULED',
    maxOvers,
    currentInningsNumber: 1,
    innings1,
    currentRunRate: 0,
    isMatchComplete: false,
    sideAScoreText: 'Yet to bat',
    sideBScoreText: 'Yet to bat',
    events: [],
  };
}

function calculateOversString(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

export function applyCricketEvent(
  state: CricketMatchState,
  event: CricketEvent,
  metadata: CricketMetadata = {}
): CricketMatchState {
  if (event.type === 'UNDO') {
    const historical = state.events.filter((e) => e.type !== 'UNDO');
    if (historical.length === 0) return createInitialCricketState(metadata);
    return replayCricketEvents(historical.slice(0, historical.length - 1), metadata);
  }

  const nextState: CricketMatchState = JSON.parse(JSON.stringify(state));
  nextState.events.push(event);
  nextState.status = 'LIVE';

  const maxBalls = nextState.maxOvers * 6;
  const activeInnings = nextState.currentInningsNumber === 1 ? nextState.innings1 : nextState.innings2!;

  if (!activeInnings) return nextState;

  if (event.type === 'NEW_BATTER' && event.newBatterId && event.newBatterName) {
    if (!activeInnings.batters[event.newBatterId]) {
      activeInnings.batters[event.newBatterId] = {
        id: event.newBatterId,
        name: event.newBatterName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
      };
    }
    if (!activeInnings.strikerId) {
      activeInnings.strikerId = event.newBatterId;
      activeInnings.strikerName = event.newBatterName;
    } else if (!activeInnings.nonStrikerId && activeInnings.strikerId !== event.newBatterId) {
      activeInnings.nonStrikerId = event.newBatterId;
      activeInnings.nonStrikerName = event.newBatterName;
    }
    return nextState;
  }

  if (event.type === 'NEW_BOWLER' && event.bowlerId && event.bowlerName) {
    if (!activeInnings.bowlers[event.bowlerId]) {
      activeInnings.bowlers[event.bowlerId] = {
        id: event.bowlerId,
        name: event.bowlerName,
        overs: 0,
        legalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      };
    }
    activeInnings.currentBowlerId = event.bowlerId;
    activeInnings.currentBowlerName = event.bowlerName;
    return nextState;
  }

  if (event.type === 'STRIKE_ROTATE') {
    const tempId = activeInnings.strikerId;
    const tempName = activeInnings.strikerName;
    activeInnings.strikerId = activeInnings.nonStrikerId;
    activeInnings.strikerName = activeInnings.nonStrikerName;
    activeInnings.nonStrikerId = tempId;
    activeInnings.nonStrikerName = tempName;
    return nextState;
  }

  if (event.type === 'BALL_BOWLED' || event.type === 'EXTRA' || event.type === 'WICKET') {
    if (activeInnings.isComplete || nextState.isMatchComplete) {
      return nextState;
    }

    const runs = event.runs || 0;
    const extraType = event.extraType;
    const extraRuns = event.extraRuns || 0;
    const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL';

    let ballScoreText = '';

    // Batter stats
    if (activeInnings.strikerId && activeInnings.batters[activeInnings.strikerId]) {
      const batter = activeInnings.batters[activeInnings.strikerId];
      if (isLegal || extraType === 'NO_BALL') {
        batter.balls += 1;
      }
      if (runs > 0 && extraType !== 'BYE' && extraType !== 'LEG_BYE') {
        batter.runs += runs;
        if (runs === 4) batter.fours += 1;
        if (runs === 6) batter.sixes += 1;
      }
    }

    // Bowler stats
    if (activeInnings.currentBowlerId && activeInnings.bowlers[activeInnings.currentBowlerId]) {
      const bowler = activeInnings.bowlers[activeInnings.currentBowlerId];
      if (isLegal) {
        bowler.legalBalls += 1;
        bowler.overs = parseFloat(calculateOversString(bowler.legalBalls));
      }
      if (extraType === 'WIDE') bowler.wides += 1 + extraRuns;
      if (extraType === 'NO_BALL') bowler.noBalls += 1 + extraRuns;

      const bowlerRuns =
        extraType === 'BYE' || extraType === 'LEG_BYE'
          ? 0
          : runs + (extraType === 'WIDE' || extraType === 'NO_BALL' ? 1 + extraRuns : 0);
      bowler.runsConceded += bowlerRuns;
    }

    // Extras
    if (extraType) {
      const penaltyOrExtra = (extraType === 'WIDE' || extraType === 'NO_BALL' ? 1 : 0) + extraRuns;
      if (extraType === 'WIDE') activeInnings.extras.wides += penaltyOrExtra;
      if (extraType === 'NO_BALL') activeInnings.extras.noBalls += penaltyOrExtra;
      if (extraType === 'BYE') activeInnings.extras.byes += extraRuns;
      if (extraType === 'LEG_BYE') activeInnings.extras.legByes += extraRuns;
      if (extraType === 'PENALTY') activeInnings.extras.penalty += extraRuns;
      activeInnings.extras.total += penaltyOrExtra;
      activeInnings.totalRuns += penaltyOrExtra;
      ballScoreText = extraType === 'WIDE' ? 'Wd' : extraType === 'NO_BALL' ? 'Nb' : `${runs}${extraType[0]}`;
    }

    activeInnings.totalRuns += runs;

    if (!ballScoreText) {
      ballScoreText = runs.toString();
    }

    if (isLegal) {
      activeInnings.legalBallsBowled += 1;
      activeInnings.oversCompleted = Math.floor(activeInnings.legalBallsBowled / 6);
      activeInnings.ballsInCurrentOver = activeInnings.legalBallsBowled % 6;
    }

    // Wicket handling
    if (event.isWicket || event.type === 'WICKET') {
      activeInnings.wickets += 1;
      ballScoreText = 'W';
      if (activeInnings.strikerId && activeInnings.batters[activeInnings.strikerId]) {
        activeInnings.batters[activeInnings.strikerId].isOut = true;
        activeInnings.batters[activeInnings.strikerId].dismissal = event.wicketType || 'BOWLED';
        activeInnings.batters[activeInnings.strikerId].bowlerName = activeInnings.currentBowlerName;
      }
      if (activeInnings.currentBowlerId && activeInnings.bowlers[activeInnings.currentBowlerId]) {
        if (event.wicketType !== 'RUN_OUT' && event.wicketType !== 'RETIRED') {
          activeInnings.bowlers[activeInnings.currentBowlerId].wickets += 1;
        }
      }
      activeInnings.strikerId = undefined;
      activeInnings.strikerName = undefined;
    }

    activeInnings.recentBalls.push(ballScoreText);
    if (activeInnings.recentBalls.length > 24) activeInnings.recentBalls.shift();

    // Strike rotation on odd runs (1, 3, 5)
    if (runs % 2 === 1 && activeInnings.strikerId && activeInnings.nonStrikerId) {
      const tempId = activeInnings.strikerId;
      const tempName = activeInnings.strikerName;
      activeInnings.strikerId = activeInnings.nonStrikerId;
      activeInnings.strikerName = activeInnings.nonStrikerName;
      activeInnings.nonStrikerId = tempId;
      activeInnings.nonStrikerName = tempName;
    }

    // Strike rotation at end of over (6 legal balls)
    if (isLegal && activeInnings.ballsInCurrentOver === 0 && activeInnings.legalBallsBowled > 0) {
      if (activeInnings.strikerId && activeInnings.nonStrikerId) {
        const tempId = activeInnings.strikerId;
        const tempName = activeInnings.strikerName;
        activeInnings.strikerId = activeInnings.nonStrikerId;
        activeInnings.strikerName = activeInnings.nonStrikerName;
        activeInnings.nonStrikerId = tempId;
        activeInnings.nonStrikerName = tempName;
      }
      // Bowler must change at end of over
      activeInnings.currentBowlerId = undefined;
      activeInnings.currentBowlerName = undefined;
    }

    // Check innings 1 completion
    if (nextState.currentInningsNumber === 1) {
      if (activeInnings.wickets >= 10 || activeInnings.legalBallsBowled >= maxBalls) {
        activeInnings.isComplete = true;
        activeInnings.closureReason = activeInnings.wickets >= 10 ? 'ALL_OUT' : 'OVERS_EXHAUSTED';
        nextState.target = activeInnings.totalRuns + 1;

        // Automatically prepare Innings 2
        nextState.currentInningsNumber = 2;
        nextState.innings2 = createInitialCricketInnings(
          2,
          activeInnings.bowlingTeamId,
          activeInnings.bowlingTeamName,
          activeInnings.battingTeamId,
          activeInnings.battingTeamName
        );
      }
    } else if (nextState.currentInningsNumber === 2 && nextState.innings2) {
      const target = nextState.target || (nextState.innings1.totalRuns + 1);
      // Check Innings 2 victory / completion
      if (activeInnings.totalRuns >= target) {
        activeInnings.isComplete = true;
        activeInnings.closureReason = 'TARGET_REACHED';
        nextState.isMatchComplete = true;
        nextState.status = 'COMPLETED';

        const isSideAWinner = activeInnings.battingTeamId === (metadata.sideAId || 'teamA');
        nextState.winner = isSideAWinner ? 'A' : 'B';
        const wicketsLeft = 10 - activeInnings.wickets;
        nextState.resultDescription = `${activeInnings.battingTeamName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
      } else if (activeInnings.wickets >= 10 || activeInnings.legalBallsBowled >= maxBalls) {
        activeInnings.isComplete = true;
        activeInnings.closureReason = activeInnings.wickets >= 10 ? 'ALL_OUT' : 'OVERS_EXHAUSTED';
        nextState.isMatchComplete = true;
        nextState.status = 'COMPLETED';

        if (activeInnings.totalRuns === target - 1) {
          nextState.winner = 'TIE';
          nextState.resultDescription = 'Match Tied';
        } else {
          const isInn1WinnerSideA = nextState.innings1.battingTeamId === (metadata.sideAId || 'teamA');
          nextState.winner = isInn1WinnerSideA ? 'A' : 'B';
          const margin = target - 1 - activeInnings.totalRuns;
          nextState.resultDescription = `${nextState.innings1.battingTeamName} won by ${margin} run${margin !== 1 ? 's' : ''}`;
        }
      }
    }
  }

  // Update Score Strings & Run Rates
  const inn1Overs = calculateOversString(nextState.innings1.legalBallsBowled);
  nextState.innings1.oversCompleted = Math.floor(nextState.innings1.legalBallsBowled / 6);
  nextState.innings1.ballsInCurrentOver = nextState.innings1.legalBallsBowled % 6;

  const currentInn = nextState.currentInningsNumber === 1 ? nextState.innings1 : nextState.innings2!;
  const currentOversDecimal = currentInn.legalBallsBowled > 0 ? currentInn.legalBallsBowled / 6 : 0;
  nextState.currentRunRate = currentOversDecimal > 0 ? parseFloat((currentInn.totalRuns / currentOversDecimal).toFixed(2)) : 0;

  if (nextState.currentInningsNumber === 2 && nextState.innings2 && nextState.target) {
    const ballsRemaining = maxBalls - nextState.innings2.legalBallsBowled;
    const runsRemaining = nextState.target - nextState.innings2.totalRuns;
    if (ballsRemaining > 0 && runsRemaining > 0) {
      nextState.requiredRunRate = parseFloat(((runsRemaining / (ballsRemaining / 6))).toFixed(2));
    } else {
      nextState.requiredRunRate = 0;
    }
  }

  // Set score text
  const isSideABattingFirst = nextState.innings1.battingTeamId === (metadata.sideAId || 'teamA');
  if (isSideABattingFirst) {
    nextState.sideAScoreText = `${nextState.innings1.totalRuns}/${nextState.innings1.wickets} (${inn1Overs})`;
    if (nextState.innings2) {
      const inn2Overs = calculateOversString(nextState.innings2.legalBallsBowled);
      nextState.sideBScoreText = `${nextState.innings2.totalRuns}/${nextState.innings2.wickets} (${inn2Overs})`;
    } else {
      nextState.sideBScoreText = 'Yet to bat';
    }
  } else {
    nextState.sideBScoreText = `${nextState.innings1.totalRuns}/${nextState.innings1.wickets} (${inn1Overs})`;
    if (nextState.innings2) {
      const inn2Overs = calculateOversString(nextState.innings2.legalBallsBowled);
      nextState.sideAScoreText = `${nextState.innings2.totalRuns}/${nextState.innings2.wickets} (${inn2Overs})`;
    } else {
      nextState.sideAScoreText = 'Yet to bat';
    }
  }

  return nextState;
}

export function replayCricketEvents(events: CricketEvent[], metadata: CricketMetadata = {}): CricketMatchState {
  let state = createInitialCricketState(metadata);
  for (const event of events) {
    state = applyCricketEvent(state, event, metadata);
  }
  return state;
}
