import { ChatBuilder } from './ChatBuilder.mjs';

export class AttackRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/attack-roll.hbs';

   // The currently selected target, if any.
   #targetActor;
   #targetToken;

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
      // Get first selected target, if any.
      // Get the first selected target token, if any.
      this.#targetToken = game.user.targets.first(); // The selected token, not the actor
      this.#targetActor = this.#targetToken?.actor; // Actor associated with the token
   }

   /**
    * Get the lowest AC that can be hit by the specified roll and THAC0
    * @param {any} rollTotal The attack roll total
    * @param {any} thac0 The attacker's effective THAC0
    * @returns The lowest AC that this roll can hit.
    */
   #getLowestACHitProcedurally(roll, rollTotal, thac0) {
      let result = null;
      let toHitTable = [];

      // Check for automatic hit or miss
      if (roll === 1) {
         result = null;  // Natural 1 always misses
      } else if (roll === 20) {
         result = -100;  // Natural 20 always hits the lowest possible AC (assuming -50 is the extreme)
      } else {
         // Loop through AC values from 19 down to -20
         let repeater = 0;
         let repeatOn = [-10, 2, 20, 30, 40, 50];
         let toHit = thac0;
         for (let ac = 0; ac < 20; ac++) {
            if (repeatOn.includes(toHit)) {
               if (repeater < 5) {
                  repeater++;
                  toHitTable.push({ ac, toHit });
               } else {
                  repeater = 0;
                  toHit -= 1;
                  toHitTable.push({ ac, toHit });
                  toHit -= 1;
               }
            } else {
               repeater = 0;
               toHitTable.push({ ac, toHit });
               toHit -= 1;
            }
         }
         repeater = 0;
         toHit = thac0 + 1;
         for (let ac = -1; ac >= -20; ac--) {
            if (repeatOn.includes(toHit)) {
               if (repeater < 5) {
                  repeater++;
                  toHitTable.push({ ac, toHit });
               } else {
                  repeater = 0;
                  toHit += 1;
                  toHitTable.push({ ac, toHit });
                  toHit += 1;
               }
            } else {
               repeater = 0;
               toHitTable.push({ ac, toHit });
               toHit += 1;
            }
         }

         // Filter all entries that the rollTotal can hit
         const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
         // Find the lowest AC from valid entries
         result = validEntries.reduce((minEntry, currentEntry) => {
            return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
         }, { ac: Infinity }).ac;
      }

      return result;
   }

   #getToHitResult() {
      const attackerToken = this.data.context;
      const thac0 = attackerToken.actor.system.thac0.value;
      let ac = this.#targetActor?.system.ac?.total;
      const hitAC = this.#getLowestACHitProcedurally(ChatBuilder.getDiceSum(this.data.roll), this.data.roll.total, thac0);
      let message = `<div class='attack-fail'>${game.i18n.localize('FADE.Chat.attackFail')}</div>`;
      let success = false;

      // If a natural 20...
      if (hitAC === -100) {
         // Setup to show success message.
         ac = 100;
      }
      if (hitAC !== null) {
         if (ac !== null && ac !== undefined) {
            if (ac >= hitAC) {
               message = `<div class='attack-success'>${game.i18n.localize('FADE.Chat.attackSuccess')}</div>`;
               success = true;
            }
         } else {
            message = `<div class='attack-info'>${game.i18n.format('FADE.Chat.attackAC', { hitAC: hitAC })}</div>`;
            success = true;
         }
      }

      return { message, success };
   }

   /**
    * Called by the various Actor and Item derived classes to create a chat message.
    */
   async createChatMessage() {
      const { caller, context, resp, roll, mdata, digest } = this.data;
      const rolls = [roll];
      const attackerToken = context;
      const attackerName = attackerToken.name;
      const targetName = this.#targetToken?.name;
      let descData = targetName ? {
         attackerid: context.id,
         attacker: attackerName,
         attackType: resp.attackType,
         targetName: targetName,
         weapon: caller.name
      } : {
         attackerid: attackerToken.id,
         attacker: attackerName,
         attackType: resp.attackType,
         weapon: caller.name
      };
      const description = targetName ? game.i18n.format('FADE.Chat.attackFlavor1', descData) : game.i18n.format('FADE.Chat.attackFlavor2', descData);
      const rollContent = await roll.render({ flavor: 'Attack Roll' });
      const toHitResult = this.#getToHitResult();
      const damageRoll = caller.getDamageRoll(resp.attackType, attackerToken);

      const rollMode = mdata?.rollmode || game.settings.get("core", "rollMode");
      // Get the actor and user names
      const userName = game.users.current.name; // User name (e.g., player name)
      const targetTokenId = this.#targetToken?.id;   // Token ID, specific to this token
      const chatData = {
         damageRoll,
         rollContent,
         description,
         descData,
         toHitResult,
         targetId: targetTokenId,
         digest: digest,
         weaponId: caller.id,
         attackType: resp.attackType
      };

      if (window.toastManager) {
         let toast = `${description}${toHitResult.message}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      let content = await renderTemplate(this.template, chatData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const chatMessageData = await this.getChatMessageData({ content, rolls, rollMode });
      await ChatMessage.create(chatMessageData);
   }   
}