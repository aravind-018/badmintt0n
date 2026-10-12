// =============================================================================
// Football Scoring Engine — Match Clock, Halves, Goals, Cards, Shootouts
// =============================================================================

export type FootballPeriod =
  | 'FIRST_HALF'
  | 'HALFTIME'
  | 'SECOND_HALF'
  | 'FULL_TIME'
  | 'EXTRA_TIME_1'
  | 'EXTRA_TIME_HT'
  | 'EXTRA_TIME_2'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED';

export interface FootballGoal {
  id: string;
  side: 'A' | 'B';
  scorerId?: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
  minute: number;
  addedMinute?: number;
  period: FootballPeriod;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

export interface FootballCard {
  id: string;
  side: 'A' | 'B';
  playerId: string;
  playerName: string;
  type: 'YELLOW' | 'RED';
  minute: number;
  period: FootballPeriod;
  reason?: string;
}

export interface FootballSubstitution {
  id: string;
  side: 'A' | 'B';
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  minute: number;
  period: FootballPeriod;
}

export interface FootballPenaltyKick {
  round: number;
  side: 'A' | 'B';
  takerName: string;
  scored: boolean;
}

export interface FootballEvent {
  id: string;
  matchId: string;
  type:
    | 'PERIOD_START'
    | 'PERIOD_END'
    | 'GOAL'
    | 'CARD_YELLOW'
    | 'CARD_RED'
    | 'SUBSTITUTION'
    | 'PENALTY_SHOOTOUT_KICK'
    | 'PAUSE'
    | 'RESUME'
    | 'CORRECTION'
    | 'UNDO';
  timestamp: string;
  createdBy: string;
  period?: FootballPeriod;
  minute?: number;
  addedMinute?: number;
  side?: 'A' | 'B';
  scorerName?: string;
  scorerId?: string;
  assistName?: string;
  assistId?: string;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
  playerName?: string;
  playerId?: string;
  cardReason?: string;
  playerOutName?: string;
  playerOutId?: string;
  playerInName?: string;
  playerInId?: string;
  penaltyScored?: boolean;
  penaltyTakerName?: string;
  requestId?: string;
}

export interface FootballMetadata {
  sideAName?: string;
  sideBName?: string;
  halfDurationMinutes?: number; // default 45
  extraTimeDurationMinutes?: number; // default 15
  requiresWinner?: boolean; // knockout match requires ET / penalties
}

export interface FootballMatchState {
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  currentPeriod: FootballPeriod;
  currentMinute: number;
  addedTimeMinutes: number;
  sideAGoals: number;
  sideBGoals: number;
  goals: FootballGoal[];
  cards: FootballCard[];
  substitutions: FootballSubstitution[];
  shootout: {
    sideAPenaltiesScored: number;
    sideBPenaltiesScored: number;
    kicks: FootballPenaltyKick[];
  };
  isMatchComplete: boolean;
  winner?: 'A' | 'B' | 'DRAW';
  sideAPoints: number; // League points: 3 for win, 1 for draw, 0 for loss
  sideBPoints: number;
  goalDifferenceA: number;
  goalDifferenceB: number;
  resultDescription: string;
  events: FootballEvent[];
}

export function createInitialFootballState(metadata: FootballMetadata = {}): FootballMatchState {
  return {
    status: 'SCHEDULED',
    currentPeriod: 'FIRST_HALF',
    currentMinute: 0,
    addedTimeMinutes: 0,
    sideAGoals: 0,
    sideBGoals: 0,
    goals: [],
    cards: [],
    substitutions: [],
    shootout: {
      sideAPenaltiesScored: 0,
      sideBPenaltiesScored: 0,
      kicks: [],
    },
    isMatchComplete: false,
    sideAPoints: 1, // Default pending draw
    sideBPoints: 1,
    goalDifferenceA: 0,
    goalDifferenceB: 0,
    resultDescription: '0 - 0',
    events: [],
  };
}

export function applyFootballEvent(
  state: FootballMatchState,
  event: FootballEvent,
  metadata: FootballMetadata = {}
): FootballMatchState {
  if (event.type === 'UNDO') {
    const historical = state.events.filter((e) => e.type !== 'UNDO');
    if (historical.length === 0) return createInitialFootballState(metadata);
    return replayFootballEvents(historical.slice(0, historical.length - 1), metadata);
  }

  const nextState: FootballMatchState = JSON.parse(JSON.stringify(state));
  nextState.events.push(event);

  if (event.minute !== undefined) {
    nextState.currentMinute = event.minute;
  }
  if (event.addedMinute !== undefined) {
    nextState.addedTimeMinutes = event.addedMinute;
  }

  if (event.type === 'PERIOD_START') {
    nextState.status = 'LIVE';
    if (event.period) {
      nextState.currentPeriod = event.period;
    }
  } else if (event.type === 'PERIOD_END') {
    if (event.period) {
      nextState.currentPeriod = event.period;
    }

    if (nextState.currentPeriod === 'FIRST_HALF') {
      nextState.currentPeriod = 'HALFTIME';
      nextState.status = 'PAUSED';
    } else if (nextState.currentPeriod === 'SECOND_HALF') {
      const isKnockout = !!metadata.requiresWinner;
      const isTied = nextState.sideAGoals === nextState.sideBGoals;

      if (isKnockout && isTied) {
        nextState.currentPeriod = 'EXTRA_TIME_1';
        nextState.status = 'PAUSED';
      } else {
        nextState.currentPeriod = 'FINISHED';
        nextState.isMatchComplete = true;
        nextState.status = 'COMPLETED';
      }
    } else if (nextState.currentPeriod === 'EXTRA_TIME_2') {
      const isTied = nextState.sideAGoals === nextState.sideBGoals;
      if (isTied) {
        nextState.currentPeriod = 'PENALTY_SHOOTOUT';
        nextState.status = 'LIVE';
      } else {
        nextState.currentPeriod = 'FINISHED';
        nextState.isMatchComplete = true;
        nextState.status = 'COMPLETED';
      }
    }
  } else if (event.type === 'PAUSE') {
    nextState.status = 'PAUSED';
  } else if (event.type === 'RESUME') {
    nextState.status = 'LIVE';
  } else if (event.type === 'GOAL' && event.side) {
    nextState.status = 'LIVE';
    const goalSide = event.side;
    if (goalSide === 'A') {
      nextState.sideAGoals += 1;
    } else {
      nextState.sideBGoals += 1;
    }

    const newGoal: FootballGoal = {
      id: event.id,
      side: goalSide,
      scorerId: event.scorerId,
      scorerName: event.scorerName || (goalSide === 'A' ? 'Team A Scorer' : 'Team B Scorer'),
      assistId: event.assistId,
      assistName: event.assistName,
      minute: event.minute ?? nextState.currentMinute,
      addedMinute: event.addedMinute,
      period: nextState.currentPeriod,
      isPenalty: event.isPenalty,
      isOwnGoal: event.isOwnGoal,
    };
    nextState.goals.push(newGoal);
  } else if (event.type === 'CARD_YELLOW' || event.type === 'CARD_RED') {
    if (event.side) {
      nextState.cards.push({
        id: event.id,
        side: event.side,
        playerId: event.playerId || 'unknown',
        playerName: event.playerName || 'Player',
        type: event.type === 'CARD_YELLOW' ? 'YELLOW' : 'RED',
        minute: event.minute ?? nextState.currentMinute,
        period: nextState.currentPeriod,
        reason: event.cardReason,
      });
    }
  } else if (event.type === 'SUBSTITUTION' && event.side && event.playerOutName && event.playerInName) {
    nextState.substitutions.push({
      id: event.id,
      side: event.side,
      playerOutId: event.playerOutId || 'out',
      playerOutName: event.playerOutName,
      playerInId: event.playerInId || 'in',
      playerInName: event.playerInName,
      minute: event.minute ?? nextState.currentMinute,
      period: nextState.currentPeriod,
    });
  } else if (event.type === 'PENALTY_SHOOTOUT_KICK' && event.side) {
    const scored = !!event.penaltyScored;
    if (event.side === 'A' && scored) nextState.shootout.sideAPenaltiesScored += 1;
    if (event.side === 'B' && scored) nextState.shootout.sideBPenaltiesScored += 1;

    nextState.shootout.kicks.push({
      round: Math.floor(nextState.shootout.kicks.length / 2) + 1,
      side: event.side,
      takerName: event.penaltyTakerName || 'Taker',
      scored,
    });
  }

  // Calculate Match Outcomes & Points
  nextState.goalDifferenceA = nextState.sideAGoals - nextState.sideBGoals;
  nextState.goalDifferenceB = nextState.sideBGoals - nextState.sideAGoals;

  if (nextState.currentPeriod === 'FINISHED' || nextState.isMatchComplete) {
    nextState.isMatchComplete = true;
    nextState.status = 'COMPLETED';

    if (nextState.sideAGoals > nextState.sideBGoals) {
      nextState.winner = 'A';
      nextState.sideAPoints = 3;
      nextState.sideBPoints = 0;
      nextState.resultDescription = `${metadata.sideAName || 'Team A'} won ${nextState.sideAGoals} - ${nextState.sideBGoals}`;
    } else if (nextState.sideBGoals > nextState.sideAGoals) {
      nextState.winner = 'B';
      nextState.sideAPoints = 0;
      nextState.sideBPoints = 3;
      nextState.resultDescription = `${metadata.sideBName || 'Team B'} won ${nextState.sideBGoals} - ${nextState.sideAGoals}`;
    } else {
      // Draw or Shootout
      if (nextState.shootout.kicks.length > 0) {
        if (nextState.shootout.sideAPenaltiesScored > nextState.shootout.sideBPenaltiesScored) {
          nextState.winner = 'A';
          nextState.resultDescription = `${metadata.sideAName || 'Team A'} won on penalties (${nextState.shootout.sideAPenaltiesScored} - ${nextState.shootout.sideBPenaltiesScored})`;
        } else if (nextState.shootout.sideBPenaltiesScored > nextState.shootout.sideAPenaltiesScored) {
          nextState.winner = 'B';
          nextState.resultDescription = `${metadata.sideBName || 'Team B'} won on penalties (${nextState.shootout.sideBPenaltiesScored} - ${nextState.shootout.sideAPenaltiesScored})`;
        } else {
          nextState.winner = 'DRAW';
          nextState.resultDescription = `Draw ${nextState.sideAGoals} - ${nextState.sideBGoals}`;
        }
      } else {
        nextState.winner = 'DRAW';
        nextState.sideAPoints = 1;
        nextState.sideBPoints = 1;
        nextState.resultDescription = `Draw ${nextState.sideAGoals} - ${nextState.sideBGoals}`;
      }
    }
  } else {
    nextState.resultDescription = `${nextState.sideAGoals} - ${nextState.sideBGoals}`;
  }

  return nextState;
}

export function replayFootballEvents(events: FootballEvent[], metadata: FootballMetadata = {}): FootballMatchState {
  let state = createInitialFootballState(metadata);
  for (const event of events) {
    state = applyFootballEvent(state, event, metadata);
  }
  return state;
}
