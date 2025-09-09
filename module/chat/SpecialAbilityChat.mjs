import { ChatBuilder } from './ChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class SpecialAbilityChat extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/special-ability.hbs';

   async createChatMessage() {
      const { context, caller, roll, options } = this.data;
      const targetTokens = Array.from(game.user.targets);
      const item = caller;
      let dmgHealRoll = item.getDamageRoll(null);
      let rollContent = null;
      let rollResult = { message: "" };
      let description = '?';

      if (roll) {
         rollContent = await roll.render();
         // Determine the roll result based on the provided data
         rollResult = await this.#getRollResult(item, roll);
         if (options.showResult === false) {
            delete rollResult.message;
         }
         description = game.i18n.format('FADE.Chat.useWithTarget', {
            owner: context.name, // The item's owning token or actor
            used: item.name,
            target: rollResult.target,
            operator: CONFIG.FADE.Operators[rollResult.operator]
         });
      } else {
         description = game.i18n.format('FADE.Chat.useSpecAbility', { owner: context.name, specAbility: item.name });
      }

      if (game.fade.toastManager) {
         let toast = `${description}${rollResult.message}`;
         game.fade.toastManager.showHtmlToast(toast, "info", item.system.rollMode);
      }

      let actions = await this._getActionsForChat(item, context, { attacks: false });

      // Prepare data for the chat template
      const chatData = {
         context,
         rollContent,
         rollResult,
         item,
         description,
         itemDescription: await item.getInlineDescription(),
         attackType: 'specialAbility',
         actions
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      // Add targets for DM chat message
      let toHitResult = { targetResults: [], message: '' };
      const noTargets = ["save", "explore"]; // some categories don't have targets.
      if (noTargets.includes(item.system.category) === false) {
         for (let targetToken of targetTokens) {
            toHitResult.targetResults.push({ targetid: targetToken.id, targetname: targetToken.name });
         }
      }

      const { conditions, durationMsgs } = await this._getConditionsForChat(item);
      const { damageRoll, healRoll } = this._getDamageHealRolls(dmgHealRoll);

      // Prepare chat message data, including rollMode
      const rolls = roll ? [roll] : null;
      const chatMessageData = this.getChatMessageData({
         content,
         rolls,
         rollMode: item.system.rollMode, // Pass the determined rollMode
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: item?.uuid,
               targets: toHitResult.targetResults,
               conditions,
               damageRoll,
               healRoll,
               actions
            }
         }
      });
      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }

   /**
    * Gets the results of the roll.
    * @private
    * @param {any} specAbility A reference to the special ability's system data.
    * @param {any} roll The rendered roll.
    * @returns A result object. Object contains one members: message, target.
    */
   async #getRollResult(specAbility, roll) {
      let result = {};
      const systemData = specAbility.system;
      let target = systemData.target;
      if (systemData.operator?.length > 0 && target?.length > 0) {
         // Roll target can be any valid roll formula
         const rollTarget = new Roll(target, roll.data);
         await rollTarget.evaluate();
         target = rollTarget.total;
         // Get the results
         const testResult = this.getBoolRollResultType({
            roll,
            target,
            operator: systemData.operator,
            autofail: systemData.autoFail,
            autosuccess: systemData.autoSuccess
         });
         result.message = this.getBoolResultHTML(testResult);
         result.target = target;
         result.operator = systemData.operator;
      }
      return result;
   }
}
