import { ChatBuilder } from './ChatBuilder.mjs';

export class GenericRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/generic-roll.hbs';

   async createChatMessage() {
      const { context, mdata, resp, roll } = this.data;
      const rolls = [roll];
      const rollContent = await roll.render();
      let targetNumber = Number(mdata.target); // Ensure the target number is a number
      let resultString = null;
      if (mdata.pass !== undefined && mdata.pass !== null) {
         // Determine if the roll is successful based on the roll type and target number      
         let testResult = this.getBoolRollResultType(roll.total, targetNumber, mdata.pass);
         resultString = this.getBoolResult(testResult);
      } else if (mdata.resultstring !== undefined && mdata.resultstring !== null) {
         resultString = mdata.resultstring;
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
