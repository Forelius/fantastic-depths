import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { ChatBuilder } from './ChatBuilder.mjs';

export class AttackRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/attack-roll.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
   }

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage() {
      const { caller, context, resp, roll, mdata, digest, options } = this.data;
      const attacker = context;
      const attackerName = attacker.token?.name ?? attacker.name;
      const targetTokens = Array.from(game.user.targets);
      const rollMode = mdata?.rollmode || game.settings.get("core", "rollMode");
      const weapon = caller;
      const descData = {
         attacker: attackerName,
         attackType: game.i18n.localize(`FADE.dialog.attackType.${resp.attackType}`).toLowerCase(),
         weapon: weapon.system.isIdentified === true ? weapon.name : weapon.system.unidentifiedName
      };
      const description = game.i18n.format('FADE.Chat.attackFlavor', descData);

      let rollContent = null;
      if (roll) {
         rollContent = await roll.render();
      }

      const toHitResult = await game.fade.registry.getSystem('toHitSystem').getToHitResults(attacker, weapon, targetTokens, roll, resp.attackType);
      const damageRoll = await weapon.getDamageRoll(resp.attackType, null, resp.targetWeaponType);

      if (game.fade.toastManager) {
         const toast = `${description}${(toHitResult?.message ? toHitResult.message : '')}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      let save = null;
      if (weapon.system.savingThrow?.length > 0) {
         save = await fadeFinder.getSavingThrow(weapon.system.savingThrow);
      }

      const chatData = {
         damageRoll,
         rollContent,
         description,
         descData,
         toHitResult,
         digest: digest,
         weapon,
         resp,
         save,
         ammoItem: options?.ammoItem,
         targetWeaponType: resp.targetWeaponType,
      };

      let content = await renderTemplate(this.template, chatData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const rolls = roll ? [roll] : null;
      const chatMessageData = this.getChatMessageData({
         content,
         rolls,
         rollMode,
         flags: {
            [game.system.id]: {
               targets: toHitResult.targetResults
            }
         }
      });
      const chatMsg = await ChatMessage.create(chatMessageData);
   }   
}