import { DialogFactory } from '/systems/fantastic-depths/module/dialog/DialogFactory.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { ChatBuilder } from './ChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class SpellCastChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/spell-cast.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
   }

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage() {
      const { context, caller, roll, options, digest } = this.data;
      const dmgHealRoll = caller.getDamageRoll(null);
      const rollMode = game.settings.get("core", "rollMode");
      const caster = context;
      const item = caller;
      const targetTokens = Array.from(game.user.targets);
      const descData = { caster: caster.name, spell: item.name };
      const description = game.i18n.format('FADE.Chat.spellCast', descData);

      let rollContent = null;
      let toHitResult = { message: "" };
      if (roll) {
         rollContent = await roll.render();
         toHitResult = await game.fade.registry.getSystem('toHitSystem').getToHitResults(caster, item, targetTokens, roll);
      } else {
         // Add targets for DM chat message
         toHitResult = { targetResults: [], message: '' };
         for (let targetToken of targetTokens) {
            toHitResult.targetResults.push({
               targetid: targetToken.id,
               targetname: targetToken.name
            });
         }
      }

      if (game.fade.toastManager) {
         let toast = `${description}${toHitResult.message}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      let actions = await this._getActionsForChat(item, context);

      // Prepare data for the chat template
      const chatData = {
         context, // the caster/instigator
         rollContent,
         toHitResult,
         item, // spell item
         attackType: 'spell',
         caster,
         durationMsg: options.durationMsg,
         actions,
         digest
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      const { damageRoll, healRoll } = this._getDamageHealRolls(dmgHealRoll);
      const rolls = roll ? [roll] : null;

      const chatMessageData = this.getChatMessageData({
         content, rolls, rollMode,
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: item?.uuid,
               targets: toHitResult?.targetResults,
               conditions: options.conditions,
               damageRoll,
               healRoll,
               actions
            }
         }
      });
      await ChatMessage.create(chatMessageData);
   }
}