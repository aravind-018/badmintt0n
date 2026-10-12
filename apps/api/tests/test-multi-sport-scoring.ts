import {
  replayCricketEvents,
  CricketEvent,
  replayFootballEvents,
  FootballEvent,
  replayChessEvents,
  ChessEvent,
  replayCarromEvents,
  CarromEvent,
  replayBadmintonEvents,
  MatchEvent as BadmintonEvent,
  extractSportScoreSummary,
  SPORTS_REGISTRY,
} from '@badminton-live/scoring';

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, detail: string = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${description} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${description} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('================================================================');
console.log('🏆 PREMIER LEAGUE — MULTI-SPORT SCORING ENGINES VERIFICATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. BADMINTON TEST
// -----------------------------------------------------------------------------
console.log('--- 1. BADMINTON ENGINE REGRESSION TEST ---');
const badmintonEvents: BadmintonEvent[] = [
  { id: '1', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' },
  { id: '2', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' },
  { id: '3', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: '', createdBy: 'B' },
];
const badState = replayBadmintonEvents(badmintonEvents, 21);
assert('Badminton points counted', badState.games[0].sideAPoints === 2 && badState.games[0].sideBPoints === 1, 'Score: 2-1');
assert('Badminton serving state updated', badState.servingState.servingSide === 'B', 'Side B serving after side-out');

// -----------------------------------------------------------------------------
// 2. CRICKET TEST
// -----------------------------------------------------------------------------
console.log('\n--- 2. CRICKET SCORING TEST ---');
const cricketEvents: CricketEvent[] = [
  // Setup batters and bowler
  { id: 'c1', matchId: 'cr1', type: 'NEW_BATTER', timestamp: '', createdBy: 'scorer', newBatterId: 'b1', newBatterName: 'Player One' },
  { id: 'c2', matchId: 'cr1', type: 'NEW_BATTER', timestamp: '', createdBy: 'scorer', newBatterId: 'b2', newBatterName: 'Player Two' },
  { id: 'c3', matchId: 'cr1', type: 'NEW_BOWLER', timestamp: '', createdBy: 'scorer', bowlerId: 'bw1', bowlerName: 'Speedy Bowler' },
  // Ball 1: 1 run (rotates strike)
  { id: 'c4', matchId: 'cr1', type: 'BALL_BOWLED', timestamp: '', createdBy: 'scorer', runs: 1 },
  // Ball 2: 4 runs (by new striker b2)
  { id: 'c5', matchId: 'cr1', type: 'BALL_BOWLED', timestamp: '', createdBy: 'scorer', runs: 4 },
  // Ball 3: Wide (+1 extra)
  { id: 'c6', matchId: 'cr1', type: 'EXTRA', timestamp: '', createdBy: 'scorer', extraType: 'WIDE', extraRuns: 0 },
  // Ball 4: Wicket (b2 out)
  { id: 'c7', matchId: 'cr1', type: 'WICKET', timestamp: '', createdBy: 'scorer', isWicket: true, wicketType: 'BOWLED' },
];

const crState = replayCricketEvents(cricketEvents, { maxOvers: 20, sideAName: 'Warriors', sideBName: 'Knights', battingFirst: 'A' });
assert('Cricket runs calculation', crState.innings1.totalRuns === 6, 'Total runs: 6 (1 + 4 + 1 extra)');
assert('Cricket wickets calculation', crState.innings1.wickets === 1, '1 wicket lost');
assert('Cricket legal balls calculation', crState.innings1.legalBallsBowled === 3, '3 legal deliveries bowled (Wide does not increment)');
assert('Batter 2 stats', crState.innings1.batters['b2']?.runs === 4 && crState.innings1.batters['b2']?.isOut === true, 'Player Two scored 4 and is out');
assert('Bowler stats', crState.innings1.bowlers['bw1']?.wickets === 1 && crState.innings1.bowlers['bw1']?.wides === 1, '1 wicket, 1 wide conceded');

// -----------------------------------------------------------------------------
// 3. FOOTBALL TEST
// -----------------------------------------------------------------------------
console.log('\n--- 3. FOOTBALL SCORING TEST ---');
const footballEvents: FootballEvent[] = [
  { id: 'f1', matchId: 'fb1', type: 'PERIOD_START', timestamp: '', createdBy: 'ref', period: 'FIRST_HALF' },
  { id: 'f2', matchId: 'fb1', type: 'GOAL', timestamp: '', createdBy: 'ref', side: 'A', minute: 14, scorerName: 'Forward Alpha' },
  { id: 'f3', matchId: 'fb1', type: 'CARD_YELLOW', timestamp: '', createdBy: 'ref', side: 'B', minute: 28, playerName: 'Defender Beta' },
  { id: 'f4', matchId: 'fb1', type: 'PERIOD_END', timestamp: '', createdBy: 'ref', period: 'FIRST_HALF' },
  { id: 'f5', matchId: 'fb1', type: 'PERIOD_START', timestamp: '', createdBy: 'ref', period: 'SECOND_HALF' },
  { id: 'f6', matchId: 'fb1', type: 'GOAL', timestamp: '', createdBy: 'ref', side: 'B', minute: 67, scorerName: 'Midfielder Gamma' },
  { id: 'f7', matchId: 'fb1', type: 'PERIOD_END', timestamp: '', createdBy: 'ref', period: 'SECOND_HALF' },
];

const fbState = replayFootballEvents(footballEvents, { sideAName: 'Arsenal FC', sideBName: 'Chelsea FC', requiresWinner: false });
assert('Football goals count', fbState.sideAGoals === 1 && fbState.sideBGoals === 1, 'Score: 1 - 1');
assert('Football full time completion', fbState.isMatchComplete && fbState.winner === 'DRAW', 'Full time Draw recorded');
assert('Football league points', fbState.sideAPoints === 1 && fbState.sideBPoints === 1, '1 point each for draw');
assert('Football cards logged', fbState.cards.length === 1 && fbState.cards[0].playerName === 'Defender Beta', 'Yellow card logged');

// -----------------------------------------------------------------------------
// 4. CHESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- 4. CHESS SCORING TEST ---');
const chessEvents: ChessEvent[] = [
  { id: 'ch1', matchId: 'cs1', type: 'MOVE_MADE', timestamp: '', createdBy: 'w', color: 'WHITE', san: 'e4' },
  { id: 'ch2', matchId: 'cs1', type: 'MOVE_MADE', timestamp: '', createdBy: 'b', color: 'BLACK', san: 'e5' },
  { id: 'ch3', matchId: 'cs1', type: 'MOVE_MADE', timestamp: '', createdBy: 'w', color: 'WHITE', san: 'Nf3' },
  { id: 'ch4', matchId: 'cs1', type: 'RESIGNATION', timestamp: '', createdBy: 'b', color: 'BLACK' },
];

const chState = replayChessEvents(chessEvents, { initialTimeMinutes: 15, incrementSeconds: 10, sideAColor: 'WHITE' });
assert('Chess moves count', chState.totalMovesCount === 3, '3 moves recorded (e4, e5, Nf3)');
assert('Chess Fischer increment added', chState.whiteTimeRemainingSeconds === 15 * 60 + 20, 'White received 2x 10s increments');
assert('Chess resignation outcome', chState.isMatchComplete && chState.result === '1-0' && chState.winner === 'A', 'White won by resignation (1 - 0)');
assert('Chess tournament points', chState.sideAPoints === 1 && chState.sideBPoints === 0, '1 point for win, 0 for loss');

// -----------------------------------------------------------------------------
// 5. CARROM TEST
// -----------------------------------------------------------------------------
console.log('\n--- 5. CARROM SCORING TEST ---');
const carromEvents: CarromEvent[] = [
  // Board 1: Side A pockets 9 white coins, Side B pockets 4 black coins, Side A pockets Queen and covers it
  { id: 'cr1', matchId: 'cm1', type: 'COIN_POCKETED', timestamp: '', createdBy: 'A', side: 'A' },
  { id: 'cr2', matchId: 'cm1', type: 'QUEEN_POCKETED', timestamp: '', createdBy: 'A', side: 'A' },
  { id: 'cr3', matchId: 'cm1', type: 'QUEEN_COVERED', timestamp: '', createdBy: 'A', side: 'A' },
  // Side B pocketed 4 coins:
  { id: 'cr4', matchId: 'cm1', type: 'COIN_POCKETED', timestamp: '', createdBy: 'B', side: 'B' },
  { id: 'cr5', matchId: 'cm1', type: 'COIN_POCKETED', timestamp: '', createdBy: 'B', side: 'B' },
  { id: 'cr6', matchId: 'cm1', type: 'COIN_POCKETED', timestamp: '', createdBy: 'B', side: 'B' },
  { id: 'cr7', matchId: 'cm1', type: 'COIN_POCKETED', timestamp: '', createdBy: 'B', side: 'B' },
  // Board complete won by Side A (Opponent black coins left: 9 - 4 = 5 + Queen bonus 3 = 8 points)
  { id: 'cr8', matchId: 'cm1', type: 'BOARD_COMPLETE', timestamp: '', createdBy: 'A', side: 'A' },
];

const caState = replayCarromEvents(carromEvents, { targetPoints: 25, maxBoards: 8 });
assert('Carrom Board 1 winner points', caState.completedBoards[0].winnerPoints === 8, 'Side A won 8 points (5 coins left + 3 queen)');
assert('Carrom cumulative points', caState.sideATotalPoints === 8 && caState.sideBTotalPoints === 0, 'Score: 8 - 0');
assert('Carrom board transition', caState.currentBoardNumber === 2, 'Advanced to Board 2');

console.log('\n================================================================');
console.log(`MULTI-SPORT ENGINE RESULTS: ${passed}/${total} TESTS PASSED CLEANLY! 🎉`);
console.log('================================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
