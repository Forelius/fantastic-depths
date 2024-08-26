import { ChatBuilder } from './ChatBuilder.mjs';

export class AbilityCheckChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/ability-check.hbs';

   async createChatMessage() {
      const { context, mdata, resp, roll } = this.data;

      const rolls = [roll];
      const rollFlavor = 'Ability Check';
      const rollContent = await roll.render({ flavor: rollFlavor });
      mdata.score = context.system.abilities[mdata.ability].value;

      const dieSum = ChatBuilder.getDiceSum(roll);

      // Determine if the roll is successful based on the roll type and target number      
      let testResult = this.getRollResultType(dieSum, mdata.score, mdata.pass);
      const resultString = ChatBuilder.getResult(testResult);

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