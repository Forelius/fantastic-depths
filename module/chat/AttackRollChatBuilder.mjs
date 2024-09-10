import { ChatBuilder } from './ChatBuilder.mjs';

export class AttackRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/attack-roll.hbs';

   // The currently selected target, if any.
   #selectedActor;

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
      // Get first selected target, if any.
      this.#selectedActor = game.user.targets.first()?.actor;
   }

   /**
    * Get the lowest AC that can be hit by the specified roll and THAC0
    * @param {any} rollTotal The attack roll total
    * @param {any} thac0 The attacker's effective THAC0
    * @returns The lowest AC that this roll can hit.
    */
   #getLowestACHitProcedurally(rollTotal, thac0) {
      let result = null;
      let toHitTable = [];

      // Check for automatic hit or miss
      if (rollTotal === 1) {
         result = null;  // Natural 1 always misses
      } else if (rollTotal === 20) {
         result = -50;  // Natural 20 always hits the lowest possible AC (assuming -50 is the extreme)
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

         // Get lowest AC that can be hit
         result = (toHitTable.find(entry => rollTotal >= entry.toHit) || {}).ac;
      }

      return result;
   }

   #getToHitResult() {
      const { caller, context, resp } = this.data;
      const dieSum = ChatBuilder.getDiceSum(this.data.roll);
      const thac0 = context.system.thac0.value;
      const ac = this.#selectedActor?.system.ac?.total;
      const hitAC = this.#getLowestACHitProcedurally(dieSum, thac0);
      let result = `<div class='attack-fail'>${game.i18n.localize('FADE.Chat.attackFail')}</div>`;

      //console.log("getToHitResult:", ac, hitAC);

      if (hitAC !== null) {
         if (ac !== null && ac !== undefined) {
            if (ac >= hitAC) {
               result = `<div class='attack-success'>${game.i18n.localize('FADE.Chat.attackSuccess')}</div>`;
            }
         } else {
            result = `<div class='attack-info'>${game.i18n.format('FADE.Chat.attackAC', { hitAC: hitAC })}</div>`
         }
      }

      return result;
   }

   async createChatMessage() {
      const { caller, context, resp, roll } = this.data;

      console.log("createChatMessage:", this.data);

      const rolls = [roll];
      const actorName = context.name;
      const targetName = this.#selectedActor?.name;
      const description = targetName ? game.i18n.format('FADE.Chat.attackFlavor1', { attacker: actorName, attackType: resp.attackType, target: targetName, weapon: caller.name })
         : game.i18n.format('FADE.Chat.attackFlavor2', { attacker: actorName, attackType: resp.attackType, weapon: caller.name });
      const rollContent = await roll.render();
      let resultString = this.#getToHitResult();

      // Get the actor and user names
      const userName = game.users.current.name; // User name (e.g., player name)
      const chatData = {
         rollContent,
         description,
         resultString,
      };
      
      const content = await renderTemplate(this.template, chatData);
      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}