import { ChatBuilder } from './ChatBuilder.mjs';

export class GenericRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/generic-check.hbs';

   async createChatMessage() {
      const { context, mdata, resp, roll } = this.data;

      const rolls = [roll];
      const rollFlavor = mdata.label;
      const rollContent = await roll.render({ flavor: rollFlavor });

      const dieSum = ChatBuilder.getDiceSum(roll);

      let targetNumber = Number(mdata.target); // Ensure the target number is a number

      let resultString = null;
      if (mdata.pass !== undefined && mdata.pass !== null) {
         // Determine if the roll is successful based on the roll type and target number      
         let testResult = this.getRollResultType(dieSum, targetNumber, mdata.pass);
         resultString = ChatBuilder.getResult(testResult);
      }

      // Get the actor and user names
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      const chatData = {
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
      };
      const content = await renderTemplate(this.template, chatData);

      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}
