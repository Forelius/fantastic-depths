import { ChatBuilder } from './ChatBuilder.mjs';
import { AttackRollChatBuilder } from './AttackRollChatBuilder.mjs';

export class SpellCastChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/spell-cast.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
   }

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage() {
      const { context, caller, roll, resp } = this.data;
      const damageRoll = await caller.getDamageRoll(null);
      const targetTokens = Array.from(game.user.targets);
      const rollMode = game.settings.get("core", "rollMode");
      const caster = context;
      const spellItem = caller;

      const descData = { caster: caster.name, spell: spellItem.name };
      const description = game.i18n.format('FADE.Chat.spellCast', descData);

      let rollContent = null;
      let toHitResult = { message: "" };
      if (roll) {
         rollContent = await roll.render();
         const attackRollChatBuilder = new AttackRollChatBuilder({}, {});
         toHitResult = await attackRollChatBuilder.getToHitResults(caster, spellItem, targetTokens, roll);
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

      if (window.toastManager) {
         let toast = `${description}${toHitResult.message}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      let save = null;
      if (spellItem.system.savingThrow?.length > 0) {
         save = game.items.find(item => item.type === 'specialAbility' && item.system.category === 'save' && spellItem.system.savingThrow === item.system.customSaveCode);
      }

      // Prepare data for the chat template
      const chatData = {
         context,
         rollContent,
         toHitResult,
         spellItem, // spell item
         caster,
         damageRoll,
         isHeal: damageRoll.type === "heal",
         targets: targetTokens,
         showTargets: !roll,
         save
      };
      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);

      const rolls = roll ? [roll] : null;
      const chatMessageData = await this.getChatMessageData({
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