import { DialogFactory } from '../../dialog/DialogFactory.mjs';
import { SocketManager } from '../SocketManager.mjs'

export class GroupInit {
   constructor() {
      this.declaredActions = game.settings.get(game.system.id, "declaredActions");
      this.phaseOrder = Object.keys(CONFIG.FADE.CombatPhases);
      this.initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
   }

   /**
    * @override
    * @returns Combatant[]
    */
   setupTurns(combat) {
      const turns = combat.combatants.contents.filter((combatant) => combatant.actor && combatant.token);
      if (turns.length > 0) {
         turns.sort((a, b) => this.#sortCombatants(a, b));
      }

      return combat.updateStateTracking(turns);
   }

   /**
   * Roll initiative for one or multiple Combatants within the Combat document
   * @override
   * @param {string|string[]} ids     A Combatant id or Array of ids for which to roll
   * @param {object} [options={}]     Additional options which modify how initiative rolls are created or presented.
   * @param {string|null} [options.formula]         A non-default initiative formula to roll. Otherwise, the system
   *                                                default is used.
   * @param {boolean} [options.updateTurn=true]     Update the Combat turn after adding new initiative scores to
   *                                                keep the turn on the same Combatant.
   * @param {object} [options.messageOptions={}]    Additional options with which to customize created Chat Messages
   * @returns {Promise<Combat>}       A promise which resolves to the updated Combat document once updates are complete.
    */
   async rollInitiative(combat, ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
      // Get all combatants and group them by disposition
      let groups = messageOptions?.group ? [messageOptions?.group] : [];
      if (groups.length === 0 && ids.length > 0) {
         const rollingCombatants = combat.combatants.filter(combatant => ids?.includes(combatant.id));
         groups = [...new Set(rollingCombatants.map(combatant => combatant.group))];
      }
      if (game.user.isGM === true) {
         for (const group of groups) {
            await this.#doInitiativeRoll(combat, combat.combatants, group);  // Use the custom initiative function
         }
      } else {
         let bRolling = true;
         // If friendly rolling, declared actions enabled...
         if (groups.includes('friendly') && this.declaredActions === true) {
            // combatant declared action is 'nothing'...
            const friendly = this.#getCombatantsForDisposition(combat, CONST.TOKEN_DISPOSITIONS.FRIENDLY);
            if (this.#hasDeclaredAction(friendly, 'nothing') === true) {
               bRolling = await this.#promptUserRoll();
            }
         }
         if (bRolling === true) {
            SocketManager.sendToGM("rollGroupInitiative", { combatid: combat.id });
         }
      }

      return this;
   }

   #sortCombatants(a, b) {
      let result = 0;
      const aActor = a.actor;
      const bActor = b.actor;
      const aGroup = a.token.disposition;
      const bGroup = b.token.disposition;

      if (a.isSlowed !== b.isSlowed) {
         result = a.isSlowed ? 1 : -1;
      }

      // Use combat phases order
      if (this.declaredActions === true && result === 0 && aGroup === bGroup && a.initiative !== null && b.initiative !== null) {
         const aPhase = aActor.system.combat?.declaredAction
            ? CONFIG.FADE.CombatManeuvers[aActor.system.combat.declaredAction].phase
            : null;
         const bPhase = bActor.system.combat?.declaredAction
            ? CONFIG.FADE.CombatManeuvers[bActor.system.combat.declaredAction].phase
            : null;

         // Only compare if both combatants have a valid phase
         if (aPhase && bPhase && aPhase !== bPhase) {
            const aPhaseIndex = this.phaseOrder.indexOf(aPhase);
            const bPhaseIndex = this.phaseOrder.indexOf(bPhase);
            result = aPhaseIndex - bPhaseIndex;
         }
      }

      // Compare initiative, descending order
      if (result === 0 && a.initiative !== b.initiative) {
         result = b.initiative - a.initiative;
      }

      // Compare dexterity, descending order; treat null/undefined as last
      const aDex = aActor.system.abilities?.dex.total ?? 0;
      const bDex = bActor.system.abilities?.dex.total ?? 0;
      if (result === 0) {
         result = bDex - aDex;
      }

      return result;
   }

   /**
    * The custom rollInitiative function
    * @param {any} combat
    */
   async #doInitiativeRoll(combat, combatants, group = null) {
      // Array to accumulate roll results for the digest message
      let rollResults = [];

      // Get all combatants and group them by disposition         
      this.groups = this.#groupCombatantsByDisposition(combatants);

      // Friendly group (uses modifiers)
      if ((group === null || group === 'friendly') && this.groups.friendly.length > 0) {
         const rollResult = await this.#rollForGroup(this.groups.friendly, "Friendlies");
         if (rollResult) rollResults.push(rollResult);
      }

      // Neutral group (uses modifiers)
      if ((group === null || group === 'neutral') && this.groups.neutral.length > 0) {
         const rollResult = await this.#rollForGroup(this.groups.neutral, "Neutrals");
         if (rollResult) rollResults.push(rollResult);
      }

      // Hostile group (monsters may not use modifiers)
      if ((group === null || group === 'hostile') && this.groups.hostile.length > 0) {
         const rollResult = await this.#rollForGroup(this.groups.hostile, "Hostiles");
         if (rollResult) rollResults.push(rollResult);
      }

      // Create a single chat message for all rolls
      if (rollResults.length > 0) {
         const updates = rollResults.reduce((a, b) => [...a, ...b.updates], []);
         if (updates.length > 0) {
            // Update multiple combatants
            await combat.updateEmbeddedDocuments("Combatant", updates);
         }

         combat._activateCombatant(0);
      }
   }

   /**
    * Determines if any of the specified combatants have their declared action set to 'nothing'
    * @param {any} combatants an array of combatants.
    * @param {*} action A string representing a combat maneuver, aka declared action.
    * @returns true if nothing is declared, otherwise false.
    */
   #hasDeclaredAction(combatants, action) {
      return combatants.filter(combatant => combatant.actor.system.combat.declaredAction === action)?.length > 0;
   }

   /**
    * Creates groups based on token disposition.
    * @param {any} combatants
    * @returns
    */
   #groupCombatantsByDisposition(combatants) {
      const groups = {
         friendly: [],
         neutral: [],
         hostile: [],
         secret: [],
      };

      // Iterate over combatants and group them by their token disposition
      for (let combatant of combatants) {
         const disposition = combatant.token.disposition;

         if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
            groups.friendly.push(combatant);
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
            groups.neutral.push(combatant);
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
            groups.hostile.push(combatant);
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
            groups.secret.push(combatant);
         }
      }

      return groups;
   }

   // method to handle group-based initiative
   async #rollForGroup(group, groupName) {
      let rollData = {};
      let result = null;
      let usedMod = 0; // Track the modifier used for this group
      const updates = [];

      rollData = { mod: 0 };
      usedMod = 0;

      // Perform the roll using the initiative formula
      const roll = new Roll(this.initiativeFormula, rollData);
      const rolled = await roll.evaluate();

      // Apply the same initiative result to all combatants in the group
      for (const combatant of group) {
         updates.push({ _id: combatant.id, initiative: rolled.total });
      }

      // Return the roll result for the digest message, including the used modifier
      if (group.length > 0) {
         const modText = usedMod !== 0 ? `(${usedMod > 0 ? '+' : ''}${usedMod})` : '';
         result = {
            message: game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: groupName, roll: rolled.total, mod: modText }),
            updates
         }
      }

      return result;
   }

   #getCombatantsForDisposition(combat, disposition) {
      return combat.combatants.filter(combatant => combatant.token.disposition === disposition);
   }

   async #promptUserRoll() {
      let result = false;
      const dialogResp = await DialogFactory({
         dialog: "yesno",
         content: game.i18n.localize('FADE.dialog.confirmInitiativeRoll'),
      });
      if (dialogResp?.resp?.rolling === true && dialogResp?.resp?.result === true) {
         result = true;
      }
      return result;
   }
}