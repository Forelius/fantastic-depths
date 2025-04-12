import { DialogFactory } from '../../dialog/DialogFactory.mjs';

export class Wrestling {

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

      if (!attackers.length) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
         return;
      }
      if (!defender) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectTarget"));
         return;
      }
      // Find the maximum WR among the attackers
      const maxWR = Math.max(...attackers.map(a => a.actor.system.wrestling));
      let primaryAttackerId = attackers.find(a => a.actor.system.wrestling === maxWR).id;

      // Prepare dialog data
      const dialogData = {
         wrestlingStates: CONFIG.FADE.WrestlingStates.map((state) => ({
            value: state,
            label: game.i18n.localize(`FADE.dialog.wrestling.states.${state}`),
         })),
         attackers: attackers.map((token) => ({
            id: token.id,
            name: token.name,
            wrestling: token.actor.system.wrestling,
            isPrimary: token.id === primaryAttackerId
         })),
         wrestlingState: CONFIG.FADE.WrestlingStates.find(state => state === 'free'),
         defender,
      };

      // Render dialog
      const template = 'systems/fantastic-depths/templates/dialog/wrestling.hbs';
      const content = await renderTemplate(template, dialogData);

      // Show dialog and gather input
      const wrestlingData = await new Promise((resolve) => {
         new Dialog({
            title: game.i18n.localize("FADE.dialog.wrestling.wrestlingContest"),
            content,
            buttons: {
               ok: {
                  label: game.i18n.localize("Roll"),
                  callback: (html) => {
                     try {
                        // Parse WR inputs for attackers
                        const attackerWRs = {};
                        attackers.forEach((attacker) => {
                           const inputId = `#attackerWR-${attacker.id}`;
                           const value = html.find(inputId).val();
                           attackerWRs[attacker.id] = value ? parseInt(value, 10) : 0; // Default to 0 if empty
                        });

                        // Parse WR input for the defender
                        const defenderWRInput = html.find("#defenderWR").val();
                        const defenderWR = defenderWRInput ? parseInt(defenderWRInput, 10) : defender.actor.system.wrestling;

                        // Parse selected wrestling state
                        const wrestlingState = html.find("#wrestlingState").val();

                        // Resolve with collected data
                        resolve({
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
                        });
                     } catch (error) {
                        console.error("Error parsing dialog inputs:", error);
                        ui.notifications.error(game.i18n.localize("FADE.notification.inputError"));
                        resolve(null); // Resolve with null to indicate failure
                     }
                  },
               },
               cancel: {
                  label: game.i18n.localize("Cancel"),
                  callback: () => resolve(null),
               },
            },
            default: "ok",
         }).render(true);
      });

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

      const states = CONFIG.FADE.WrestlingStates;
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
      let message = `<h2>${game.i18n.localize("FADE.dialog.wrestling.wrestlingContest")}:</h2>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.attacker")}:</div>`;
      attackerGroup.members.forEach(member => {
         const memberHD = member.hd || 0;
         message += `<div>${member.name} (${game.i18n.localize("FADE.Actor.HitDiceShort")}: ${memberHD}) → ${member.bonus}</div>`;
      });
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.groupWR")}: ${groupWR}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.defender")}:</div>`;
      message += `<div>${defender.name} (${game.i18n.localize("FADE.Actor.HitDiceShort")}: ${defender.hd}) → ${defender.bonus}</div>`;
      message += "<hr/>";
      message += `<div class='attack-result attack-info'>${game.i18n.format("FADE.dialog.wrestling.winsRound", { winner })}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.attacker")}: ${attackerRoll.total} (${attackerRoll.formula})</div>`;
      message += `<div>${await attackerRoll.render()}</div>`;
      message += `<div>${game.i18n.localize("FADE.dialog.wrestling.defender")}: ${defenderRoll.total} (${defenderRoll.formula})</div>`;
      message += `<div>${await defenderRoll.render()}</div>`;
      message += "<hr/>";
      message += `<div style='margin-top:4px;' class='attack-result attack-info'>${game.i18n.localize("FADE.dialog.wrestling.stateLabel")}: ${localizedState}</div>`;

      return message;
   }

   static calculateWrestlingRating(actor) {
      let result = 0;

      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      let wrestlingMastery = null;
      if (masteryEnabled) {
         wrestlingMastery = actor.items.find(item => item.type === 'mastery' && item.system.weaponType === 'wr');
      }

      if (actor.type === 'character') {
         const { base, modifier, dieSides, sign } = actor.system.getParsedHD();
         result = Math.ceil(base / 2) + actor.system.ac.value;
         result += actor.system.abilities.str.mod + actor.system.abilities.dex.mod;
         // If has wrestling mastery
         if (wrestlingMastery) {
            result += wrestlingMastery.system.acBonus;
         }
      } else {
         // Wrestling skill
         const data = actor.system;
         const { base, modifier, dieSides, sign } = actor.system.getParsedHD();
         //const hitDice = data.hp.hd?.match(/^\d+/)[0];
         if (base) {
            result = Math.ceil(base * 2);
         }
         // Determine if the monster is wearing any non-natural armor.
         const hasArmor = actor.items.some(item => item.type === 'armor' && item.system.equipped === true && item.system.natural === false);
         if (hasArmor) {
            result += data.ac.value;
         } else {
            result += 9;
         }

         // If has wrestling mastery
         if (wrestlingMastery) {
            result += wrestlingMastery.system.acBonus;
         }
      }
      return result + actor.system.mod?.wrestling ?? 0;
   }
}