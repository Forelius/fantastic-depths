import { ChatBuilder } from './ChatBuilder.mjs';

export class AbilityCheckChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/ability-check.hbs';

   async createChatMessage() {
      const { context, mdata, resp, roll } = this.data;

      const rolls = [roll];
      const rollFlavor = 'Ability Check';
      const rollContent = await roll.render({ flavor: rollFlavor });
      mdata.score = context.system.abilities[mdata.ability].value;

      let testResult = false;
      const dieSum = ChatBuilder.getDiceSum(roll);

      let targetNumber = Number(mdata.target); // Ensure the target number is a number

      // Determine if the roll is successful based on the roll type and target number
      let success = false;
      switch (mdata.pass) {
         case 'lt':
            success = dieSum < mdata.score;
            break;
         case 'lte':
            success = dieSum <= mdata.score;
            break;
         case 'gt':
            success = dieSum > mdata.score;
            break;
         case 'gte':
            success = dieSum >= mdata.score;
            break;
         default:
            success = false; // If no valid roll type is provided, default to failure
            break;
      }

      testResult = success ? this.RESULT_TYPE.PASSED : this.RESULT_TYPE.FAILED;

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
