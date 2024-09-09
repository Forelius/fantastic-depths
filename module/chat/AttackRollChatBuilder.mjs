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

   #getToHitResult() {
      const { caller, context, resp } = this.data;
      const dieSum = ChatBuilder.getDiceSum(this.data.roll);
      
      const ac = this.#selectedActor?.system.ac?.total;
      console.log("Target AC:", ac, this.#selectedActor?.name);
      //let targetNumber = Number(mdata.target); // Ensure the target number is a number
      //console.log("getToHitResult", this.data, target);
      return "TODO";
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
      console.log("createChatMessage:", this.data);
      const content = await renderTemplate(this.template, chatData);
      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}