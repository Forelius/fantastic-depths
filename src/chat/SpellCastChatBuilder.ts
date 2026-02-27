import { ChatBuilder } from "./ChatBuilder.js";
import { CodeMigrate } from "../sys/migration.js";
import { SpellItem } from "../item/SpellItem.js"

export class SpellCastChatBuilder extends ChatBuilder {
   static template = "systems/fantastic-depths/templates/chat/spell-cast.hbs";

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage(): Promise<void> {
      const { context, caller, roll, options, digest } = this.data;
      const rollMode = game.settings.get("core", "rollMode");
      const caster = context; // Can be actor or token
      const casterActor = caster?.actor || caster; // context could be actor or token.
      const casterName = caster?.name; // context could be actor or token.
      const item: SpellItem = caller;
      const targetTokens = Array.from(game.user.targets).map((i: PropertyBag) => (i.document ?? i) as Token);
      const dmgHealRoll = item.getDamageRoll(null, targetTokens?.[0]);
      const descData = { caster: casterName, spell: item.name };
      const description = game.i18n.format("FADE.Chat.spellCast", descData);

      let rollContent = null;
      let toHitResult = { targetResults: null, message: "" };
      if (roll) {
         rollContent = await roll.render();
         toHitResult = await game.fade.registry.getSystem("toHitSystem").getToHitResults(caster, item, targetTokens, roll);
      } else {
         // Add targets for DM chat message
         toHitResult = { targetResults: [], message: "" };
         for (const targetToken of targetTokens) {
            toHitResult.targetResults.push({ targetuuid: targetToken.uuid, targetname: targetToken.name });
         }
      }

      if (game.fade.toastManager) {
         const toast = `${description}${toHitResult.message}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      const actions = await this._getActionsForChat(item, caster);

      // Prepare data for the chat template
      const chatData = {
         rollContent,
         description,
         toHitResult,
         item, // spell item
         attackType: "spell",
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
               owneruuid: caster.uuid, // Can be actor or token
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
      Hooks.call("fadeCastSpell", {
         tokenUuid: caster?.actor ? caster.uuid : null,
         actorUuid: casterActor.uuid,
         itemUuid: item.uuid,
         targets: targetTokens.map(i => i.uuid)
      });
   }
}