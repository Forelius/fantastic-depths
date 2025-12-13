import { DialogFactory } from "../../dialog/DialogFactory.mjs";

export class Wrestling {
   static States = ["defpin", "deftakedown", "defgrab", "free", "attgrab", "atttakedown", "attpin"];

   /**
    * Opens the Wrestling Dialog for user interaction.
    * This method serves as the primary entry point for triggering the wrestling dialog,
    * allowing the GM or player to initiate a wrestling contest. It delegates the dialog
    * management and wrestling outcome processing to `getWrestleDialog`.
    *
    * @returns {Promise<void>} Resolves when the dialog interaction is complete.
    * - If the dialog is canceled, a warning is shown to the user.
    * - If confirmed, the wrestling contest is processed and results are displayed in chat.
    */
   static async showWrestlingDialog() {
      // Gather controlled tokens and targets
      const attackers = Array.from(canvas.tokens.controlled);
      const defender = game.user.targets?.first();
      const dlgOptions = {
         attackers,
         defender,
         states: Wrestling.States.map((state) => ({
            value: state,
            label: game.i18n.localize(`FADE.dialog.wrestling.states.${state}`),
         })),
      };

      if (!dlgOptions.attackers.length) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
         return;
      }
      if (!dlgOptions.defender) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectTarget"));
         return;
      }

      const dialogResp = await DialogFactory({ dialog: "wrestling" }, null, dlgOptions);
      let wrestlingData = null;

      if (dialogResp?.action === "roll") {
         console.debug(dialogResp);

         // Parse WR inputs for attackers
         const attackerWRs = {};
         attackers.forEach((attacker) => {
            const inputId = `attackerWR-${attacker.id}`;
            const value = dialogResp[inputId];
            attackerWRs[attacker.id] = value ? parseInt(value, 10) : 0; // Default to 0 if empty
         });

         // Parse WR input for the defender
         const defenderWRInput = dialogResp.defenderWR;
         const defenderWR = defenderWRInput ? parseInt(defenderWRInput, 10) : defender.actor.system.wrestling;
         // Parse selected wrestling state
         const wrestlingState = dialogResp.wrestlingState;

         // Resolve with collected data
         wrestlingData = {
            attackerGroup: {
               leaderWR: Math.max(...Object.values(attackerWRs)), // Highest WR among attackers
               members: attackers.map((attacker) => ({
                  name: attacker.name,
                  id: attacker.id,
                  hd: attacker.actor.system.hp.hd, // Hit Dice
                  wrestling: attackerWRs[attacker.id],   // Wrestling Rating
               })),
            },
            defender: {
               name: defender.name,
               id: defender.id,
               hd: defender.actor.system.hp.hd, // Hit Dice
               wrestling: defenderWR,   // Wrestling Rating
            },
            wrestlingState,
         };
      }

      // Exit if canceled
      if (!wrestlingData) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.canceled"));
         return;
      }

      // Calculate the outcome
      const wrestling = new Wrestling();
      const result = await wrestling.calculateWrestlingOutcome(wrestlingData);

      // Output result
      ChatMessage.create({ content: result.message });
   }

   async calculateWrestlingOutcome(wrestlingData) {
      let { attackerGroup, wrestlingState, defender } = wrestlingData;

      // Calculate group WR
      const leaderHD = attackerGroup.leaderHD; // Leader's Hit Dice
      let groupWR = 0;

      // Apply -3 penalty if pinned
      defender.bonus = defender.wrestling + (wrestlingState === "attpin" ? -3 : 0);
      for (let attacker of attackerGroup.members) {
         if (attacker.id === attackerGroup.members[0].id) {
            attacker.bonus = attacker.wrestling + (wrestlingState === "defpin" ? -3 : 0);
         } else {
            attacker.bonus = (attacker.hd <= leaderHD / 2) ? 1 : 5;
         }
         groupWR += attacker.bonus;
      }

      const attackerRoll = await new Roll(`1d20 + ${groupWR}`).roll();
      const defenderRoll = await new Roll(`1d20 + ${defender.bonus}`).roll();

      const states = Wrestling.States;
      const currentIndex = states.indexOf(wrestlingState);

      let newIndex = currentIndex; // Default: no change
      if (attackerRoll.total > defenderRoll.total) {
         // Attacker wins: move state forward
         newIndex = Math.min(currentIndex + 1, states.length - 1);
      } else if (attackerRoll.total < defenderRoll.total) {
         // Defender wins: move state backward
         newIndex = Math.max(currentIndex - 1, 0);
      }

      const result = {
         groupWR,
         newState: states[newIndex],
         attackerGroup,
         defender
      };

      const message = await this.constructWrestlingMessage(attackerRoll, defenderRoll, result);
      return { result, message, groupWR };
   }

   async constructWrestlingMessage(attackerRoll, defenderRoll, result) {
      const { newState, attackerGroup, groupWR, defender } = result;

      // Directly localize the new state
      const localizedState = game.i18n.localize(`FADE.dialog.wrestling.states.${newState}`);
      const winner = attackerRoll.total > defenderRoll.total ? game.i18n.localize("FADE.dialog.wrestling.attacker") : game.i18n.localize("FADE.dialog.wrestling.defender");
      let message = `<div class="text-size18b">${game.i18n.localize("FADE.dialog.wrestling.wrestlingContest")}:</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.attacker")}:</div>`;
      attackerGroup.members.forEach(member => {
         message += `<div>${member.name} → ${member.bonus}</div>`;
      });
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.groupWR")}: ${groupWR}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.defender")}:</div>`;
      message += `<div>${defender.name} → ${defender.bonus}</div>`;
      message += `<div class="attack-result attack-info">${game.i18n.format("FADE.dialog.wrestling.winsRound", { winner })}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.attacker")}: ${attackerRoll.total} (${attackerRoll.formula})</div>`;
      message += `<div>${await attackerRoll.render()}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.defender")}: ${defenderRoll.total} (${defenderRoll.formula})</div>`;
      message += `<div>${await defenderRoll.render()}</div>`;
      message += `<div style="margin-top:4px;" class="attack-result attack-info">${game.i18n.localize("FADE.dialog.wrestling.stateLabel")}: ${localizedState}</div>`;

      return message;
   }

   static calculateWrestlingRating(actor) {
      let result = 0;

      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      let wrestlingMastery = null;
      if (masteryEnabled) {
         wrestlingMastery = actor.items.find(item => item.type === "mastery" && item.system.weaponType === "wr");
      }

      if (actor.type === "character") {
         const { base } = actor.system.getParsedHD();
         result = Math.ceil(base / 2) + actor.system.ac.value;
         result += actor.system.abilities?.str?.mod + actor.system.abilities?.dex?.mod;
         // If has wrestling mastery
         if (wrestlingMastery) {
            result += wrestlingMastery.system.acBonus;
         }
      } else if (actor.type === "monster") {
         // Wrestling skill
         const data = actor.system;
         const { base } = actor.system.getParsedHD();
         if (base) {
            result = Math.ceil(base * 2);
         }
         // Determine if the monster is wearing any non-natural armor.
         const hasArmor = actor.items.some(item => item.type === "armor" && item.system.equipped === true && item.system.natural === false);
         if (hasArmor) {
            result += data.ac.value;
         } else {
            result += CONFIG.FADE.Armor.acNaked;
         }

         // If has wrestling mastery
         if (wrestlingMastery) {
            result += wrestlingMastery.system.acBonus;
         }
      }
      return result + (actor.system.mod?.wrestling ?? 0);
   }
}