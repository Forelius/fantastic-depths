import { DialogFactory } from '../dialog/DialogFactory.mjs';

export class Wrestling {
   calculateWrestlingOutcome(attackerWR, defenderWR, defenderStatus, wrestlingState) {
      defenderWR += defenderStatus;

      // Perform rolls
      const attackerRoll = new Roll(`1d20 + ${attackerWR}`).roll({ async: false });
      const defenderRoll = new Roll(`1d20 + ${defenderWR}`).roll({ async: false });

      // Determine winner
      let winner;
      if (attackerRoll.total > defenderRoll.total) {
         winner = "attacker";
      } else if (defenderRoll.total > attackerRoll.total) {
         winner = "defender";
      } else {
         winner = "tie";
      }

      return {
         attackerRoll,
         defenderRoll,
         winner,
         wrestlingState,
         message: this.constructWrestlingMessage(attackerRoll,defenderRoll,winner,wrestlingState,defenderStatus)
      };
   }

   constructWrestlingMessage(attackerRoll, defenderRoll, winner, wrestlingState, defenderStatus) {
      const winnerLoc = game.i18n.localize(winner);
      let message = `<strong>${game.i18n.localize("Wrestling Contest Results")}:</strong><br>`;
      message += `- <strong>${game.i18n.localize("Attacker Roll")}:</strong> ${attackerRoll.total} (Roll: ${attackerRoll.formula})<br>`;
      message += `- <strong>${game.i18n.localize("Defender Roll")}:</strong> ${defenderRoll.total} (Roll: ${defenderRoll.formula})<br>`;
      message += `- <strong>${game.i18n.localize("Current Wrestling State")}:</strong> ${wrestlingState}<br>`;
      if (winner === "tie") {
         message += `- <strong>${game.i18n.localize("Result")}:</strong> ${game.i18n.localize("Tie. No progress this round.")}<br>`;
      } else {
         message += `- <strong>${game.i18n.localize("Winner")}:</strong> ${winnerLoc}<br>`;
         if (wrestlingState === "Pin" && defenderStatus === -3) {
            message += `- <strong>${game.i18n.localize("Note")}:</strong> ${game.i18n.localize(
               "The defender remains pinned and cannot act unless escaping."
            )}<br>`;
         } else {
            message += `- <strong>${winnerLoc} advances to the next wrestling state.</strong>`;
         }
      }
      return message;
   }

   static async showWrestlingDialog() {
      const dataset = { dialog: 'wrestle' };
      const caller = game.user;

      // Render the dialog with the necessary data
      const dialogResponse = await DialogFactory(dataset, caller, { });
   }
}