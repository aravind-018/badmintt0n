import { prisma } from '@badminton-live/database';

/**
 * Advances the winner of a completed match to the next knockout round slot (nextMatchId, nextMatchSlot).
 */
export async function advanceBracketWinner(matchId: string) {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return;

    const isMatchFinished = match.status === 'COMPLETED' || match.status === 'WALKOVER' || match.status === 'RETIRED';
    const winnerId = match.winnerId;

    if (isMatchFinished && winnerId && match.nextMatchId && match.nextMatchSlot) {
      const winnerName = winnerId === match.sideAId ? match.sideAName : match.sideBName;
      const winnerType = winnerId === match.sideAId ? match.sideAType : match.sideBType;

      const nextMatchUpdate: any = {};
      if (match.nextMatchSlot === 'A') {
        nextMatchUpdate.sideAId = winnerId;
        nextMatchUpdate.sideAName = winnerName;
        nextMatchUpdate.sideAType = winnerType;
      } else {
        nextMatchUpdate.sideBId = winnerId;
        nextMatchUpdate.sideBName = winnerName;
        nextMatchUpdate.sideBType = winnerType;
      }

      await prisma.match.update({
        where: { id: match.nextMatchId },
        data: nextMatchUpdate,
      });

      console.log(
        `[Bracket Progression] Winner '${winnerName}' (${winnerId}) advanced to match ${match.nextMatchId} (Slot ${match.nextMatchSlot})`
      );
    }
  } catch (err) {
    console.error('[Bracket Progression Error]:', err);
  }
}
