import { ChatBuilder } from './ChatBuilder.mjs';

export class SpecialAbilityChat extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/special-ability.hbs';

   async createChatMessage() {
      const { context, caller, roll, resp } = this.data;
      const targetTokens = Array.from(game.user.targets);
      const specAbility = caller;
      const damageRoll = await caller.getDamageRoll(null);
      const descData = { owner: context.name, specAbility: specAbility.name };
      const description = game.i18n.format('FADE.Chat.useSpecAbility', descData);
      let rollContent = null;
      let rollResult = { message: "" };

      if (roll) {
         rollContent = await roll.render();
         // Determine the roll result based on the provided data
         rollResult = this.getRollResult(specAbility, roll);
      }

      if (window.toastManager) {
         let toast = `${description}${rollResult.message}`;
         window.toastManager.showHtmlToast(toast, "info", specAbility.system.rollMode);
      }

      // Prepare data for the chat template
      const chatData = {
         context,
         rollContent,
         rollResult,
         specAbility,
         description,
         isHeal: damageRoll.damageType === "heal",
         damageRoll,
         targets: targetTokens,
         showTargets: !roll
      };
      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);

      // Prepare chat message data, including rollMode
      const rolls = roll ? [roll] : null;
      const chatMessageData = await this.getChatMessageData({
         content,
         rolls,
         rollMode: specAbility.system.rollMode, // Pass the determined rollMode
      });
      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }

   getRollResult(specAbility, roll) {
      let result = { };
      const systemData = specAbility.system;
      if (systemData.operator?.length > 0) {
         const testResult = this.getBoolRollResultType({
            roll,
            target: systemData.target,
            operator: systemData.operator,
            autoFail: systemData.autoFail,
            autoSuccess: systemData.autoSuccess
         });
         result.message = this.getBoolResult(testResult);
      }
      return result;
   }
}
