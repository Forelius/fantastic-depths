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
      const { context, caller, roll, options } = this.data;
      const dmgHealRoll = caller.getDamageRoll(null);
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

      let actions = await this._getActionsForChat(item, context, true);

      // Prepare data for the chat template
      const chatData = {
         context, // the caster/instigator
         rollContent,
         toHitResult,
         item, // spell item
         attackType: 'spell',
         caster,
         durationMsg: options.durationMsg,
         actions
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
               targets: toHitResult.targetResults,
               conditions: options.conditions,
               damageRoll,
               healRoll,
               actions
            }
         }
      });
      await ChatMessage.create(chatMessageData);
   }

   static async clickApplyCondition(event) {
      const element = event.currentTarget;
      const dataset = element.dataset;
      // Custom behavior for damage rolls      
      if (dataset.name || dataset.uuid) {
         event.preventDefault(); // Prevent the default behavior
         event.stopPropagation(); // Stop other handlers from triggering the event
         let sourceCondition = await fromUuid(dataset.uuid);
         if (!sourceCondition) {
            sourceCondition = await game.fade.fadeFinder.getCondition(dataset.name);
         }
         if (sourceCondition) {                      
            // Get targets
            const selected = Array.from(canvas.tokens.controlled);
            const targeted = Array.from(game.user.targets);
            let applyTo = [];
            let hasTarget = targeted.length > 0;
            let hasSelected = selected.length > 0;
            let isCanceled = false;

            if (hasTarget && hasSelected) {
               const dialogResp = await DialogFactory({
                  dialog: "yesno",
                  title: game.i18n.localize('FADE.dialog.applyToPrompt'),
                  content: game.i18n.localize('FADE.dialog.applyToPrompt'),
                  yesLabel: game.i18n.localize('FADE.dialog.targeted'),
                  noLabel: game.i18n.localize('FADE.dialog.selected'),
                  defaultChoice: "yes"
               });

               if (dialogResp?.resp?.result == undefined) {
                  isCanceled = true;
               } else if (dialogResp?.resp?.result === true) {
                  hasSelected = false;
               } else if (dialogResp?.resp?.result === false) {
                  hasTarget = false;
               }
            }

            if (isCanceled === true) {
               // do nothing.
            } else if (hasTarget) {
               applyTo = targeted;
            } else if (hasSelected) {
               applyTo = selected;
            } else {
               ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
            }

            // Ensure we have a target ID
            if (applyTo.length > 0) {
               const durationSec = Number.parseInt(dataset.duration);
               for (let target of applyTo) {
                  if (target.actor.isOwner === true) {
                     const conditions = (await target.actor.createEmbeddedDocuments("Item", [sourceCondition]));
                     if (Number.isNaN(durationSec) === false) {
                        for(let condition of conditions){
                           condition.setEffectsDuration(durationSec);
                        }
                     }
                  }
               }
            }
         }
      }
   }
}