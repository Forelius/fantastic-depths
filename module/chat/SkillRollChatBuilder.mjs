import { GenericRollChatBuilder } from './GenericRollChatBuilder.mjs';

export class SkillRollChatBuilder extends GenericRollChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/skill-roll.hbs';

   async createChatMessage() {
      const { context, mdata, resp, roll, caller } = this.data;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);
      const damageRoll = await caller.getDamageRoll(null);
      let targetNumber = Number(mdata.target); // Ensure the target number is a number
      const targetTokens = Array.from(game.user.targets);

      // Determine the roll result based on the provided data
      let resultString = this.getResultString(mdata, roll, targetNumber);

      // Get the actor and user names
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)

      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      this.handleToast(actorName, mdata, roll, resultString, rollMode);

      // Prepare data for the chat template
      const chatData = {
         damageRoll,
         isHeal: damageRoll.damageType === "heal",
         targets: targetTokens,
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         context,
         skillItem: caller
      };
      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);

      // Prepare chat message data, including rollMode from mdata
      const chatMessageData = await this.getChatMessageData({
         caller,
         content,
         rolls,
         rollMode, // Pass the determined rollMode
      });

      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }
}
