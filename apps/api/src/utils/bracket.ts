import { prisma } from '@badminton-live/database';

/**
 * Advances the winner of a completed match to the next knockout round slot (nextMatchId, nextMatchSlot),
 * or reverts the slot to 'TBD' if the match was reset.
 */
export async function advanceBracketWinner(matchId: string) {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || !match.nextMatchId || !match.nextMatchSlot) return;

    const isMatchFinished = match.status === 'COMPLETED' || match.status === 'WALKOVER' || match.status === 'RETIRED';
    const winnerId = match.winnerId;

    if (isMatchFinished && winnerId) {
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
    } else {
      // If match is no longer finished (reverted to SCHEDULED/LIVE/etc), reset downstream slot if next match is not completed
      const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
      if (nextMatch && nextMatch.status === 'SCHEDULED') {
        const resetUpdate: any = {};
        if (match.nextMatchSlot === 'A' && nextMatch.sideAId !== 'TBD') {
          resetUpdate.sideAId = 'TBD';
          resetUpdate.sideAName = 'TBD';
        } else if (match.nextMatchSlot === 'B' && nextMatch.sideBId !== 'TBD') {
          resetUpdate.sideBId = 'TBD';
          resetUpdate.sideBName = 'TBD';
        }
        if (Object.keys(resetUpdate).length > 0) {
          await prisma.match.update({
            where: { id: match.nextMatchId },
            data: resetUpdate,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Bracket Progression Error]:', err);
  }
}
