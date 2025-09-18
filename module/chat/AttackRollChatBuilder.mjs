import { ChatBuilder } from './ChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

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
      const targetActor = targetTokens?.length > 0 ? targetTokens[0].actor : null;
      const rollMode = mdata?.rollmode || game.settings.get("core", "rollMode");
      const weaponItem = caller;
      const descData = {
         attacker: attackerName,
         attackType: game.i18n.localize(`FADE.dialog.attackType.${resp.attackType}`).toLowerCase(),
         weapon: weaponItem.knownName
      };
      const description = game.i18n.format('FADE.Chat.attackFlavor', descData);

      let rollContent = null;
      if (roll) {
         rollContent = await roll.render();
      }

      const toHitResult = await game.fade.registry.getSystem('toHitSystem').getToHitResults(attacker, weaponItem, targetTokens, roll, resp.attackType);
      const damageRoll = weaponItem.getDamageRoll(resp.attackType, null, resp.targetWeaponType, targetActor);

      if (game.fade.toastManager) {
         const toast = `${description}${(toHitResult?.message ? toHitResult.message : '')}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      let actions = await this._getActionsForChat(weaponItem, context, { attacks: false, saves: true, abilities: false });

      const chatData = {
         rollContent,
         description,
         descData,
         toHitResult,
         digest: digest,
         weapon: weaponItem,
         resp,
         ammoItem: options?.ammoItem,
         targetWeaponType: resp.targetWeaponType,
         targetActor,
         actions
      };
      let content = await CodeMigrate.RenderTemplate(this.template, chatData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const { conditions, durationMsgs } = await this._getConditionsForChat(weaponItem);

      const rolls = roll ? [roll] : null;
      const chatMessageData = this.getChatMessageData({
         content,
         rolls,
         rollMode,
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: weaponItem.uuid,
               damageRoll,
               targets: toHitResult.targetResults,
               actions,
               conditions,
            }
         }
      });
      await ChatMessage.create(chatMessageData);
   }
}