import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { ChatBuilder } from './ChatBuilder.mjs';

export class SpellCastChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/spell-cast.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
   }

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage() {
      const { context, caller, roll, options } = this.data;
      const damageRoll = caller.getDamageRoll(null);
      const targetTokens = Array.from(game.user.targets);
      const rollMode = game.settings.get("core", "rollMode");
      const caster = context;
      const item = caller;

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

      let save = null;
      if (item.system.savingThrow?.length > 0) {
         save = await fadeFinder.getSavingThrow(item.system.savingThrow);
      }

      // Prepare data for the chat template
      const chatData = {
         context, // the caster/instigator
         rollContent,
         toHitResult,
         item, // spell item
         attackType: 'spell',
         caster,
         damageRoll,
         isHeal: damageRoll.type === "heal",
         targets: targetTokens,
         showTargets: !roll,
         save,
         durationMsg: options.durationMsg
      };
      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);

      const rolls = roll ? [roll] : null;
      const chatMessageData = this.getChatMessageData({
         content, rolls, rollMode,
         flags: {
            [game.system.id]: {
               targets: toHitResult.targetResults
            }
         }
      });
      await ChatMessage.create(chatMessageData);
   }
}