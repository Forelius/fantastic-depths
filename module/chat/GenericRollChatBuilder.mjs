import { ChatBuilder } from './ChatBuilder.mjs';

export class GenericRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/generic-roll.hbs';

   async getRollContent(roll, mdata) {
      if (mdata.flavor) {
         return roll.render({ flavor: mdata.flavor });
      } else {
         return roll.render();
      }
   }

   async createChatMessage() {
      const { context, mdata, resp, roll } = this.data;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);
      let targetNumber = Number(mdata.target); // Ensure the target number is a number

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
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
      };
      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);

      // Prepare chat message data, including rollMode from mdata
      const chatMessageData = await this.getChatMessageData({
         content,
         rolls,
         rollMode, // Pass the determined rollMode
      });

      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }

   handleToast(actorName, mdata, roll, resultString, rollMode) {
      if (window.toastManager) {
         let toast = `${actorName}: ${mdata.label ?? ''}${mdata.desc ?? ''}`;
         toast += `<div>Roll: ${roll.total}</div>`;
         if (resultString) toast += `<div>${resultString}</div>`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }
   }

   getResultString(mdata, roll, targetNumber) {
      let resultString = null;
      if (mdata.pass !== undefined && mdata.pass !== null) {
         let testResult = this.getBoolRollResultType(roll.total, targetNumber, mdata.pass);
         resultString = this.getBoolResult(testResult);
      } else if (mdata.resultstring !== undefined && mdata.resultstring !== null) {
         resultString = mdata.resultstring;
      }
      return resultString;
   }
}
