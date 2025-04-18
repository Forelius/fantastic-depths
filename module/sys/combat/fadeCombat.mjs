// fadeCombat.mjs
import { SocketManager } from '../SocketManager.mjs'

// Custom Combat class
export class fadeCombat extends Combat {
   static initialize() {
      /** ------------------------------- */
      /** Register combat-related hooks   */
      /** ------------------------------- */
      Hooks.on('renderCombatTracker', async (app, html, data) => data?.combat?.onRenderCombatTracker(app, html, data));
      Hooks.on('createCombat', (combat) => combat.onCreateCombat(combat));
      Hooks.on('deleteCombat', (combat) => combat.onDeleteCombat(combat));
      Hooks.on('createCombatant', async (combatant, options, userId) => await options.parent.onCreateCombatant(combatant, options, userId));
      Hooks.on('deleteCombatant', async (combatant, options, userId) => await options.parent.onDeleteCombatant(combatant, options, userId));
   }

   get ownedCombatants() {
      return this.combatants.filter(combatant => combatant.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
   }

   /**@override */
   prepareBaseData() {
      super.prepareBaseData();
      this.nextRoundMode = game.settings.get(game.system.id, "nextRound");
      this.declaredActions = game.settings.get(game.system.id, "declaredActions");
      this.initiativeSystem = game.fade.registry.getSystem('initiativeSystem');
   }

   /**
   * @override
   * @returns Combatant[]
   */
   setupTurns() {
      return this.initiativeSystem.setupTurns(this);
   }

   async rollInitiative(ids, options) {
      return await this.initiativeSystem.rollInitiative(this, ids, options);
   }

   updateStateTracking(turns) {
      // Update state tracking
      let c = turns[this.turn];
      this.current = {
         round: this.round,
         turn: this.turn,
         combatantId: c ? c.id : null,
         tokenId: c ? c.tokenId : null
      };

      // One-time initialization of the previous state
      if (!this.previous) this.previous = this.current;
      return this.turns = turns;
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
               await combatant.update({ initiative: null });
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
      const combatantControls = combatantElement.querySelector('.combatant-controls');
      const template = 'systems/fantastic-depths/templates/sidebar/combatant-controls.hbs';
      let templateData = { combatant };

      const controlsContent = await renderTemplate(template, templateData);
      combatantControls.insertAdjacentHTML("afterbegin", controlsContent);
   }

   /**
    * Add custom elements to the combat tracker UI.
    * @param {any} app
    * @param {any} html
    * @param {any} data
    */
   async onRenderCombatTracker(app, html, data) {
      if (html instanceof Element === false) {
         html = html[0];
      }
      if (data?.combat?.combatants) {
         // Iterate over each combatant and apply a CSS class based on disposition
         for (let combatant of data.combat.combatants) {
            /* console.debug(combatant);*/
            const disposition = combatant.token.disposition;
            const combatantElement = html.querySelector(`.combatant[data-combatant-id="${combatant.id}"]`);
            // Set disposition indicator
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
               combatantElement.classList.add('disposition-friendly');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
               combatantElement.classList.add('disposition-neutral');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
               combatantElement.classList.add('disposition-hostile');
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
               combatantElement.classList.add('disposition-secret');
            }

            if (data.combat.declaredActions === true) {
               await data.combat.addDeclarationControl(data.combat, combatantElement, combatant);
            }
         }
      }
   }

   onCreateCombat(combat) {
      if (game.user.isGM) {
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker
         // Send a chat message when combat begins
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.Chat.combatTracker.created"),
         });
      }
   }

   onDeleteCombat(combat) {
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

   async onCreateCombatant(combatant, options, userId) {
      if (game.user.isGM) {
         if (combatant.actor === null || combatant.actor === undefined) {
            console.warn(`World actor no longer exists for combatant ${combatant.name}. Skipping combatant.`);
         } else {
            await combatant.actor.update({ 'system.combat.declaredAction': "nothing" });
         }
      }
   }

   async onDeleteCombatant(combatant, options, userId) {
      if (game.user.isGM && combatant.actor) {
         this.tryClosePlayerCombatForm([userId]);
         await combatant.actor.update({ 'system.combat.declaredAction': null });
      }
   }

   async _activateCombatant(turn) {
      if (game.user.isGM) {
         await game.combat.update({ turn });
      }
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
}