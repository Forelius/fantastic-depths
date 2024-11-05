// fadeCombat.mjs
// Import any required modules (if necessary)
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

// Custom Combat class
export class fadeCombat extends Combat {
   constructor(data, context) {
      super(data, context);
      this._initVariables();
   }

   async _initVariables() {
      this.initiativeMode = await game.settings.get(game.system.id, "initiativeMode");
      this.nextRoundMode = await game.settings.get(game.system.id, "nextRound");
   }

   /**
    * @override
    * @returns Combatant[]
    */
   async setupTurns() {
      // console.debug("setupTurns sorting...");
      let combatants = await super.setupTurns();

      // Check to make sure all combatants still exist.
      combatants = combatants.filter((combatant) => combatant.actor !== null && combatant.actor !== undefined);

      //const initiativeMode = await game.settings.get(game.system.id, "initiativeMode");
      if (this.initiativeMode === "group") {
         combatants.sort(this.sortCombatantsGroup);
      } else {
         combatants.sort(this.sortCombatants);
      }
      return this.turns = combatants;
   }

   /**
    * @override
   * Roll initiative for one or multiple Combatants within the Combat document
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
      await this.#doInitiativeRoll(ids);  // Use the custom initiative function
      return this;
   }

   /** 
    * @override 
    * Begin the combat encounter, advancing to round 1 and turn 1
      * @returns {Promise<Combat>}
    **/
   async startCombat() {
      let result = super.startCombat();
      const user = game.users.get(game.userId);  // Get the user who initiated the roll
      const speaker = { alias: user.name };  // Use the player's name as the speaker
      if (user.isGM) {
         // Send a chat message when combat officially begins (round 1)
         ChatMessage.create({
            speaker: speaker,
            content: `Combat has begun!`,
         });
      }
      return result;
   }

   /** 
    * @override 
    * Advance the combat to the next round
    * @returns {Promise<Combat>}
    * */
   async nextRound() {
      let nextRound = this.round + 1;
      let result = await super.nextRound();
      const user = game.users.get(game.userId);  // Get the user who initiated the roll
      const speaker = { alias: user.name };  // Use the player's name as the speaker

      if (user.isGM) {
         for (let combatant of this.combatants) {
            // Reset initiative to null
            combatant.actor.update({ "system.combat.attacksAgainst": 0 });
         }
         // If initiative next round mode is reset...
         if (this.nextRoundMode === "reset") {
            // Reset initiative for all combatants
            for (let combatant of this.combatants) {
               // Reset initiative to null
               combatant.update({ initiative: null });  
            }

            // Optionally send a chat message to notify players
            ChatMessage.create({
               speaker: speaker,
               content: `Round ${nextRound} started. Initiative rolls reset.`,
            });
         }
         else if (this.nextRoundMode === "reroll") {
            // Reroll initiative
            this.rollInitiative([]);

            // Optionally send a chat message to notify players
            ChatMessage.create({
               speaker: speaker,
               content: `Round ${nextRound} started. Initiative rerolled for all combatants.`,
            });
         }
         else {
            // Optionally send a chat message to notify players
            ChatMessage.create({
               speaker: speaker,
               content: `Round ${nextRound} started. Initiative held for all combatants.`,
            });
         }
      }

      return null;
   }

   sortCombatants(a, b) {
      let result = 0;
      let aActor = a.actor;
      let bActor = b.actor;

      if (aActor && bActor) {
         let aWeapon = aActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
         let bWeapon = bActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
         let aSlowEquipped = aWeapon?.system.tags?.includes("slow") ?? false;
         let bSlowEquipped = bWeapon?.system.tags?.includes("slow") ?? false;
         // Compare slowEquipped, true comes after false
         if (aSlowEquipped !== bSlowEquipped) {
            result = aSlowEquipped ? 1 : -1;
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

   sortCombatantsGroup(a, b) {
      let result = 0;
      const aActor = a.actor;
      const bActor = b.actor;
      const aGroup = a.token.disposition;
      const bGroup = b.token.disposition;

      // Compare slowEquipped, true comes before false
      const aWeapon = aActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
      const bWeapon = bActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
      const aSlowEquipped = aWeapon?.system.tags?.includes("slow") ?? false;
      const bSlowEquipped = bWeapon?.system.tags?.includes("slow") ?? false;
      if (aGroup === bGroup && aSlowEquipped !== bSlowEquipped) {
         result = aSlowEquipped ? 1 : -1;
      }

      // Compare initiative, descending order
      if (result === 0 && a.initiative !== b.initiative) {
         result = b.initiative - a.initiative;
      }

      // Compare dexterity, descending order; treat null/undefined as last
      const aDex = aActor.system.abilities?.dex.value ?? 0;
      const bDex = bActor.system.abilities?.dex.value ?? 0;
      if (result === 0) {
         result = bDex - aDex;
      }

      return result;
   }

   static async renderCombatTracker(app, html, data) {
      if (data?.combat?.combatants) {
         // Iterate over each combatant and apply a CSS class based on disposition
         data.combat.combatants.forEach(combatant => {
            /* console.debug(combatant);*/
            const disposition = combatant.token.disposition;
            const combatantElement = html.find(`.combatant[data-combatant-id="${combatant.id}"]`);
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
               combatantElement.addClass('disposition-friendly');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
               combatantElement.addClass('disposition-neutral');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
               combatantElement.addClass('disposition-hostile');
            }
         });
      }
   }

   // Function to handle group-based initiative
   async #rollForGroup(group, groupName) {
      const groupModifier = await game.settings.get(game.system.id, "groupInitiativeModifier");
      const initiativeFormula = await game.settings.get(game.system.id, "initiativeFormula");
      let rollData = {};
      let result = null;
      let usedMod = 0; // Track the modifier used for this group

      // Apply the group modifier
      if (groupModifier === "none") {
         rollData = { mod: 0 };
         usedMod = 0;
      } else if (groupModifier === "average") {
         // Average Dexterity modifier
         const averageMod = group.reduce((sum, c) => sum + this.#getInitiativeMod(c.actor), 0) / group.length;
         usedMod = Math.floor(averageMod);
         rollData = { mod: usedMod };
      } else if (groupModifier === "highest") {
         // Highest Dexterity modifier
         usedMod = Math.max(...group.map(c => this.#getInitiativeMod(c.actor)));
         rollData = { mod: usedMod };
      }

      // Perform the roll using the initiative formula
      const roll = new Roll(initiativeFormula, rollData);
      const rolled = await roll.evaluate();

      // Apply the same initiative result to all combatants in the group
      for (let combatant of group) {
         combatant.update({ initiative: rolled.total });
      }

      // Return the roll result for the digest message, including the used modifier
      if (group.length > 0) {
         let modText = usedMod !== 0 ? ` (mod ${usedMod > 0 ? '+' : ''}${usedMod})` : '';
         result = `${groupName} rolled ${rolled.total}${modText}`;
      }

      return result;
   }

   #getInitiativeMod(actor) {
      let result = 0;

      if (actor.type === 'monster') {
         result = actor.system?.initiative?.mod || 0;
      } else {
         result = actor.system?.abilities?.dex?.mod || 0;
      }

      return result;
   }

   /**
 * The custom rollInitiative function
 * @param {any} combat
 */
   async #doInitiativeRoll(ids) {
      // Fetch the initiative formula and mode from settings
      const initiativeFormula = await game.settings.get(game.system.id, "initiativeFormula");
      const initiativeMode = await game.settings.get(game.system.id, "initiativeMode");

      // Get all combatants and group them by disposition
      const combatants = this.combatants.filter((i) => ids.length === 0 || ids.includes(i.id));
      this.groups = this.#groupCombatantsByDisposition(combatants);

      // Array to accumulate roll results for the digest message
      let rollResults = [];

      // Handle group-based initiative by disposition
      if (initiativeMode === "group") {
         // Friendly group (uses modifiers)
         if (this.groups.friendly.length > 0) {
            let rollResult = await this.#rollForGroup(this.groups.friendly, "Friendlies");
            if (rollResult) rollResults.push(rollResult);
         }

         // Neutral group (uses modifiers)
         if (this.groups.neutral.length > 0) {
            let rollResult = await this.#rollForGroup(this.groups.neutral, "Neutrals");
            if (rollResult) rollResults.push(rollResult);
         }

         // Hostile group (monsters may not use modifiers)
         if (this.groups.hostile.length > 0) {
            let rollResult = await this.#rollForGroup(this.groups.hostile, "Hostiles");
            if (rollResult) rollResults.push(rollResult);
         }
      } else {
         // Individual-based initiative
         for (let combatant of combatants) {
            const rollData = combatant.actor.getRollData();
            const mod = this.#getInitiativeMod(combatant.actor); // Get the initiative modifier
            rollData.mod = mod;

            // Perform the roll using the initiative formula
            const roll = new Roll(initiativeFormula, rollData);
            const rolled = await roll.evaluate();

            // Update the combatant's initiative with the roll result
            await combatant.update({ initiative: rolled.total });

            // Accumulate the roll result for the digest message, showing mod only if it's not 0
            let modText = mod !== 0 ? ` (mod ${mod > 0 ? '+' : ''}${mod})` : '';
            rollResults.push(`${combatant.name} rolled ${rolled.total}${modText}`);
         }
      }

      // Create a single chat message for all rolls
      if (rollResults.length > 0) {
         // Store the base formula without the mod for flavor text
         const baseFormula = initiativeFormula.replace(/\+?\s*@mod/, '').trim();
         const flavorText = `Initiative Rolls (Base Formula: ${initiativeFormula.replace(/\+?\s*@mod/, '').trim()})`;
         const user = game.users.get(game.userId);  // Get the user who initiated the roll
         const speaker = { alias: user.name };  // Use the player's name as the speaker
         ChatMessage.create({
            speaker: speaker,
            content: rollResults.join('<br>'),  // Combine all roll results into one message with line breaks
            flavor: flavorText
         });
      }
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
         hostile: []
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
         }
      }

      return groups;
   }
}

/** ------------------------------- */
/** Register combat-related hooks   */
/** ------------------------------- */
Hooks.on('renderCombatTracker', fadeCombat.renderCombatTracker);

Hooks.on('createCombat', (combat) => {
   const user = game.users.get(game.userId);  // Get the user who initiated the roll
   if (user.isGM) {
      const speaker = { alias: user.name };  // Use the player's name as the speaker

      // Send a chat message when combat begins
      ChatMessage.create({
         speaker: speaker,
         content: `Combat encounter created.`,
      });
   }
});

Hooks.on('deleteCombat', (combat) => {
   const user = game.users.get(game.userId);  // Get the user who initiated the roll
   if (user.isGM) {
      const speaker = { alias: user.name };  // Use the player's name as the speaker
      // Send a chat message when combat ends
      ChatMessage.create({
         speaker: speaker,
         content: `Combat encounter has ended.`,
      });
   }
});