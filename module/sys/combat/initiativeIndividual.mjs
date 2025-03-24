
export class initiativeIndividual{
   constructor(combat) {
      this.combat = combat;
      this.combatants = combat.combatants;
      this.declaredActions = game.settings.get(game.system.id, "declaredActions");
      this.phaseOrder = Object.keys(CONFIG.FADE.CombatPhases);
      this.initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
   }

   /**
    * @override
    * @returns Combatant[]
    */
   setupTurns() {
      const turns = this.combatants.contents.filter((combatant) => combatant.actor && combatant.token);
      if (turns.length > 0) {
         turns.sort((a, b) => this.#sortCombatants(a, b));
      }

      return this.combat.updateStateTracking(turns);
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
   async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
      const combatants = this.combatants.filter((i) => ids.length === 0 || ids.includes(i.id));
      await this.#doInitiativeRoll(combatants);  // Use the custom initiative function
      return this;
   }

   #sortCombatants(a, b) {
      let result = 0;
      let aActor = a.actor;
      let bActor = b.actor;

      if (aActor && bActor) {
         // Use combat phases order
         if (this.initiativeMode === "individualChecklist" && this.declaredActions === true && result === 0 && a.initiative !== null && b.initiative !== null) {
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

         if (result === 0 && this.initiativeMode !== "simpleIndividual") {
            let aWeapon = aActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
            let bWeapon = bActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
            let aSlowEquipped = aWeapon?.system.isSlow;
            let bSlowEquipped = bWeapon?.system.isSlow;
            // Compare slowEquipped, true comes after false
            if (aSlowEquipped !== bSlowEquipped) {
               result = aSlowEquipped ? 1 : -1;
            }
         }

         // Compare initiative, descending order
         if (result === 0 && a.initiative !== b.initiative) {
            result = b.initiative - a.initiative;
         }

         // Compare dexterity, descending order; treat null/undefined as last
         let aDex = aActor.system.abilities?.dex.val;
         let bDex = bActor.system.abilities?.dex.val;
         if (result === 0) {
            if (!aDex) {
               if (bDex) {
                  result = 1;
               }
            } else if (!bDex) {
               result = -1;
            } else if (aDex !== bDex) {
               result = bDex - aDex;
            }
         }
      }

      return result;
   }

   /**
    * The custom rollInitiative function
    * @param {any} combat
    */
   async #doInitiativeRoll(combatants, group = null) {
      // Array to accumulate roll results for the digest message
      let rollResults = [];

      // Individual-based initiative  
      const userIds = [...new Set(combatants.flatMap(c => {
         const actor = c.actor;
         if (!actor) return [];
         return Object.keys(actor.ownership).filter(userId =>
            actor.ownership[userId] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
         );
      }))];

      for (let combatant of combatants) {
         const updates = [];
         const rollData = combatant.actor.getRollData();
         const mod = this.#getInitiativeMod(combatant.actor); // Get the initiative modifier
         rollData.mod = mod;

         // Perform the roll using the initiative formula
         const roll = new Roll(this.initiativeFormula, rollData);
         const rolled = await roll.evaluate();

         // Update the combatant's initiative with the roll result
         updates.push({ _id: combatant.id, initiative: rolled.total });

         // Accumulate the roll result for the digest message, showing mod only if it's not 0
         const modText = mod !== 0 ? `(mod ${mod > 0 ? '+' : ''}${mod})` : '';
         rollResults.push({
            message: game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: combatant.name, roll: rolled.total, mod: modText }),
            updates
         });
      }

      // Create a single chat message for all rolls
      if (rollResults.length > 0) {
         const updates = rollResults.reduce((a, b) => [...a, ...b.updates], []);
         if (updates.length > 0) {
            // Update multiple combatants
            await this.combat.updateEmbeddedDocuments("Combatant", updates);
         }

         this.combat._activateCombatant(0);
      }
   }

   #getInitiativeMod(actor) {
      let result = 0;
      result += actor.system?.initiative?.mod || 0;
      if (actor.type !== 'monster') {
         result += actor.system?.abilities?.dex?.mod || 0;
      }
      return result;
   }
}