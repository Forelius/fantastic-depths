// fadeCombat.mjs
import { DialogFactory } from '../../dialog/DialogFactory.mjs';
import { SocketManager } from '../SocketManager.mjs'

// Custom Combat class
export class fadeCombat extends Combat {
   get ownedCombatants() {
      return this.combatants.filter(combatant => combatant.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
   }

   /**@override */
   prepareBaseData() {
      super.prepareBaseData();
      this._initVariables();
   }

   _initVariables() {
      this.groupModifier = game.settings.get(game.system.id, "groupInitiativeModifier");
      this.initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
      this.initiativeMode = game.settings.get(game.system.id, "initiativeMode");
      this.nextRoundMode = game.settings.get(game.system.id, "nextRound");
      this.declaredActions = game.settings.get(game.system.id, "declaredActions");
      this.phaseOrder = Object.keys(CONFIG.FADE.CombatPhases);
   }

   /**
    * @override
    * @returns Combatant[]
    */
   setupTurns() {
      // console.debug("setupTurns sorting...");
      let combatants = super.setupTurns();

      // Check to make sure all combatants still exist.
      combatants = combatants.filter((combatant) => combatant.actor && combatant.token);

      if (this.initiativeMode === "group" || this.initiativeMode === "groupHybrid") {
         combatants.sort((a, b) => this.sortCombatantsGroup(a, b));
      } else {
         combatants.sort((a, b) => this.sortCombatantsIndividual(a, b));
      }

      return this.turns = combatants;
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
      if (this.initiativeMode === "group" || this.initiativeMode === "groupHybrid") {
         // Get all combatants and group them by disposition
         let groups = messageOptions?.group ? [messageOptions?.group] : [];
         if (groups.length === 0 && ids.length > 0) {
            const rollingCombatants = this.combatants.filter(combatant => ids?.includes(combatant.id));
            groups = [...new Set(rollingCombatants.map(combatant => combatant.group))];
         }
         if (game.user.isGM === true) {
            for (const group of groups) {
               await this.#doInitiativeRoll(this.combatants, group);  // Use the custom initiative function
            }
         } else {
            let bRolling = true;
            // If friendly rolling, declared actions enabled...
            if (groups.includes('friendly') && this.declaredActions === true) {
               // combatant declared action is 'nothing'...
               const friendly = this.#getCombatantsForDisposition(CONST.TOKEN_DISPOSITIONS.FRIENDLY);
               if (this.#hasDeclaredAction(friendly, 'nothing') === true) {
                  bRolling = await this.#promptUserRoll();
               }
            }
            if (bRolling === true) {
               SocketManager.sendToGM("rollGroupInitiative", { combatid: this.id });
            }
         }
      } else {
         const combatants = this.combatants.filter((i) => ids.length === 0 || ids.includes(i.id));
         await this.#doInitiativeRoll(combatants);  // Use the custom initiative function
      }

      return this;
   }

   /** 
    * @override 
    * Begin the combat encounter, advancing to round 1 and turn 1
      * @returns {Promise<Combat>}
    **/
   async startCombat() {
      let result = super.startCombat();
      const speaker = { alias: game.user.name };  // Use the player's name as the speaker
      if (game.user.isGM) {
         this.#resetCombatants();
         // Send a chat message when combat officially begins (round 1)
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize(`FADE.Chat.combatTracker.begin`),
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
      let result = super.nextRound();
      const speaker = { alias: game.user.name };  // Use the player's name as the speaker

      if (game.user.isGM) {
         this.#resetCombatants();

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
               content: game.i18n.format(`FADE.Chat.combatTracker.initReset`, { round: nextRound }),
            });
         }
         else if (this.nextRoundMode === "reroll") {
            // Reroll initiative
            this.rollInitiative([]);

            // Optionally send a chat message to notify players
            ChatMessage.create({
               speaker: speaker,
               content: game.i18n.format(`FADE.Chat.combatTracker.initRerolled`, { round: nextRound }),
            });
         }
         else {
            // Optionally send a chat message to notify players
            ChatMessage.create({
               speaker: speaker,
               content: game.i18n.format(`FADE.Chat.combatTracker.initHeld`, { round: nextRound }),
            });
         }
      }

      return result;
   }

   /**
    * Adds the combat manuever declaration control to the combat tracker.
    * @param {any} combat
    * @param {any} combatantElement
    * @param {any} combatant
    */
   async addDeclarationControl(combat, combatantElement, combatant) {
      const combatantControls = combatantElement.find('.combatant-controls');
      const template = 'systems/fantastic-depths/templates/sidebar/combatant-controls.hbs';
      let templateData = { combatant };

      const controlsContent = await renderTemplate(template, templateData);
      combatantControls.prepend(controlsContent);
      // Add a change event listener to update the actor's data when the dropdown selection changes
      if (combatant.initiative === null || game.user.isGM) {
         combatantElement.find('#combatantDeclaration').on('change', async (event) => {
            const newAction = event.target.value;
            await combatant.actor.update({ 'system.combat.declaredAction': newAction });
         });
      }
   }

   sortCombatantsIndividual(a, b) {
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
            let aSlowEquipped = aWeapon?.system.tags?.includes("slow") ?? false;
            let bSlowEquipped = bWeapon?.system.tags?.includes("slow") ?? false;
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

   sortCombatantsGroup(a, b) {
      let result = 0;
      const aActor = a.actor;
      const bActor = b.actor;
      const aGroup = a.token.disposition;
      const bGroup = b.token.disposition;

      if (this.initiativeMode === "groupHybrid") {
         const aWeapon = aActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
         const bWeapon = bActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
         // Compare slowEquipped, true comes before false
         const aSlowEquipped = aWeapon?.system.tags?.includes("slow") ?? false;
         const bSlowEquipped = bWeapon?.system.tags?.includes("slow") ?? false;
         if (aGroup === bGroup && aSlowEquipped !== bSlowEquipped) {
            result = aSlowEquipped ? 1 : -1;
         }
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
      const aDex = aActor.system.abilities?.dex.value ?? 0;
      const bDex = bActor.system.abilities?.dex.value ?? 0;
      if (result === 0) {
         result = bDex - aDex;
         //console.debug(`Group init. sort by dex: ${aActor.name} ${aDex} vs ${bActor.name} ${bDex}`);
      }

      return result;
   }

   /**
 * Add custom elements to the combat tracker UI.
 * @param {any} app
 * @param {any} html
 * @param {any} data
 */
   static async onRenderCombatTracker(app, html, data) {
      let hasAnyRolls = false;
      if (data?.combat?.combatants) {
         // Iterate over each combatant and apply a CSS class based on disposition
         for (let combatant of data.combat.combatants) {
            /* console.debug(combatant);*/
            const disposition = combatant.token.disposition;
            const combatantElement = html.find(`.combatant[data-combatant-id="${combatant.id}"]`);
            // Set disposition indicator
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
               combatantElement.addClass('disposition-friendly');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
               combatantElement.addClass('disposition-neutral');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
               combatantElement.addClass('disposition-hostile');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
               combatantElement.addClass('disposition-secret');
            }

            if (data.combat.declaredActions === true) {
               await data.combat.addDeclarationControl(data.combat, combatantElement, combatant);
            }
         }
      }
   }

   static onCreateCombat(combat) {
      if (game.user.isGM) {
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker
         // Send a chat message when combat begins
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.Chat.combatTracker.created"),
         });
      }
   }

   static onDeleteCombat(combat) {
      if (game.user.isGM) {
         combat.tryClosePlayerCombatForm();
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker
         // Send a chat message when combat ends
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.Chat.combatTracker.ended"),
         });
         for (let combatant of combat.combatants) {
            combatant.exitCombat();
         }
      }
   }

   static onCreateCombatant(combatant, options, userId) {
      if (game.user.isGM) {
         combatant.actor.update({ 'system.combat.declaredAction': "nothing" });
      }
   }

   static onDeleteCombatant(combatant, options, userId) {
      if (game.user.isGM) {
         this.tryClosePlayerCombatForm([userId]);
         combatant.actor.update({ 'system.combat.declaredAction': null });
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

   #tryShowPlayerCombatForm() {
      if (this.declaredActions === true) {
         SocketManager.sendToAllUsers("showPlayerCombat", { combatid: this.id });
      }
   }

   tryClosePlayerCombatForm(userIds = []) {
      if (this.declaredActions === true) {
         if (userIds.length > 0) {
            SocketManager.sendToUsers(userIds, "closePlayerCombat", { combatid: this.id });
         } else {
            SocketManager.sendToAllUsers("closePlayerCombat", { combatid: this.id });
         }
      }
   }

   #resetCombatants() {
      this.#tryShowPlayerCombatForm();
      for (let combatant of this.combatants) {
         combatant.roundReset();
      }
   }

   // Function to handle group-based initiative
   async #rollForGroup(group, groupName) {
      let rollData = {};
      let result = null;
      let usedMod = 0; // Track the modifier used for this group

      // Apply the group modifier
      if (this.groupModifier === "none") {
         rollData = { mod: 0 };
         usedMod = 0;
      } else if (this.groupModifier === "average") {
         // Average Dexterity modifier
         const averageMod = group.reduce((sum, c) => sum + this.#getInitiativeMod(c.actor), 0) / group.length;
         usedMod = Math.floor(averageMod);
         rollData = { mod: usedMod };
      } else if (this.groupModifier === "highest") {
         // Highest Dexterity modifier
         usedMod = Math.max(...group.map(c => this.#getInitiativeMod(c.actor)));
         rollData = { mod: usedMod };
      }

      // Perform the roll using the initiative formula
      const roll = new Roll(this.initiativeFormula, rollData);
      const rolled = await roll.evaluate();

      // Apply the same initiative result to all combatants in the group
      for (const combatant of group) {
         combatant.update({ initiative: rolled.total });
      }

      // Return the roll result for the digest message, including the used modifier
      if (group.length > 0) {
         const modText = usedMod !== 0 ? `(${usedMod > 0 ? '+' : ''}${usedMod})` : '';
         result = game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: groupName, roll: rolled.total, mod: modText });
      }

      return result;
   }

   #getInitiativeMod(actor) {
      let result = 0;

      result += actor.system?.initiative?.mod || 0;

      if (actor.type !== 'monster') {
         result += actor.system?.abilities?.dex?.mod || 0;
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

      // Handle group-based initiative by disposition
      if (this.initiativeMode === "group" || this.initiativeMode === "groupHybrid") {
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
      } else {
         // Individual-based initiative  
         const userIds = [...new Set(combatants.flatMap(c => {
            const actor = c.actor;
            if (!actor) return [];
            return Object.keys(actor.ownership).filter(userId =>
               actor.ownership[userId] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
            );
         }))];

         for (let combatant of combatants) {
            const rollData = combatant.actor.getRollData();
            const mod = this.#getInitiativeMod(combatant.actor); // Get the initiative modifier
            rollData.mod = mod;

            // Perform the roll using the initiative formula
            const roll = new Roll(this.initiativeFormula, rollData);
            const rolled = await roll.evaluate();

            // Update the combatant's initiative with the roll result
            await combatant.update({ initiative: rolled.total });

            // Accumulate the roll result for the digest message, showing mod only if it's not 0
            const modText = mod !== 0 ? `(mod ${mod > 0 ? '+' : ''}${mod})` : '';
            rollResults.push(game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: combatant.name, roll: rolled.total, mod: modText }));
         }
      }

      // Create a single chat message for all rolls
      if (rollResults.length > 0) {
         // Store the base formula without the mod for flavor text
         const baseFormula = this.initiativeFormula.replace(/\+?\s*@mod/, '').trim();
         const flavorText = game.i18n.format(`FADE.Chat.combatTracker.rollFormula`, { formula: baseFormula });
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker
         ChatMessage.create({
            speaker: speaker,
            content: rollResults.join('<br>'),  // Combine all roll results into one message with line breaks
            flavor: flavorText
         });
      }
   }

   #getCombatantsForDisposition(disposition) {
      return this.combatants.filter(combatant => combatant.token.disposition === disposition);
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

/** ------------------------------- */
/** Register combat-related hooks   */
/** ------------------------------- */
Hooks.on('renderCombatTracker', fadeCombat.onRenderCombatTracker);
Hooks.on('createCombat', fadeCombat.onCreateCombat);
Hooks.on('deleteCombat', fadeCombat.onDeleteCombat);
Hooks.on('createCombatant', fadeCombat.onCreateCombatant);
Hooks.on('deleteCombatant', fadeCombat.onDeleteCombatant);