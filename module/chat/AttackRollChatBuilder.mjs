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
    * @param {any} rollTotal
    * @param {any} thac0
    * @returns
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
      let result = "<div class='attack-fail'>You missed!</div>";

      console.log("getToHitResult:", ac, hitAC);

      if (hitAC !== null) {
         if (ac !== null && ac !== undefined) {
            if (ac >= hitAC) {
               result = `<div class='attack-success'>You hit!</div>`;
            } 
         } else {
            result = `<div class='attack-info'>You hit <strong>AC ${hitAC}</strong> and above.</div>`
         }
      } 

      return result;
   }

   async createChatMessage() {
      const { caller, context, mdata, resp, roll } = this.data;

      const rolls = [roll];
      const rollFlavor = mdata.label;
      const rollContent = await roll.render({ flavor: rollFlavor });

      let resultString = this.#getToHitResult();

      // Get the actor and user names
      const actorName = context.name;
      const userName = game.users.current.name; // User name (e.g., player name)
      const chatData = {
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
      };
      //console.log("createChatMessage:", this.data);
      const content = await renderTemplate(this.template, chatData);
      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}