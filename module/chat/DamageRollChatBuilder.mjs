import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatBuilder } from './ChatBuilder.mjs';

export class DamageRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/damage-roll.hbs';

   async getRollContent(roll, mdata) {
      return roll.render();
   }

   async createChatMessage() {
      const { context, mdata, roll, options, digest } = this.data;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);

      // Get the actor and user names
      const instigatorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      // Prepare data for the chat template, including the message ID
      const renderData = {
         rollContent,
         mdata,
         instigatorName,
         userName,
         resultString: options.resultString,
         damage: options.damage,
         showApplyDamage: options.showApplyDamage,
         attackName: options.attackName,
         digest
      };

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(options.resultString, "info", rollMode);
      }

      // Render the content using the template, now with messageId
      let content = await renderTemplate(this.template, renderData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const chatMessageData = this.getChatMessageData({
         content, rolls, rollMode,
         [`flags.${game.system.id}.attackdata`]: {
            mdata,
            damage: options.damage
         }
      });
      const chatMsg = await ChatMessage.create(chatMessageData);
   }

   /**
   * Click event handler for damage/heal roll buttons.
   * @param {any} ev
   */
   static async clickDamageRoll(ev) {
      const element = ev.currentTarget;
      const dataset = element.dataset;

      // Custom behavior for damage rolls      
      if (dataset.type === "damage" || dataset.type==="heal") {
         ev.preventDefault(); // Prevent the default behavior
         ev.stopPropagation(); // Stop other handlers from triggering the event

         await DamageRollChatBuilder.handleDamageRoll(ev, dataset);
      }
   }

   /**
    * Handles the damage/heal roll
    * @param {any} ev
    * @param {any} dataset
    */
   static async handleDamageRoll(ev, dataset) {
      const { weaponuuid, attacktype, damagetype, targetweapontype } = dataset;
      const theItem = await fromUuid(weaponuuid);
      const instigator = theItem.actor.token ?? theItem.actor;
      let rolling = true;
      let dialogResp = null;
      const isHeal = damagetype === "heal";

      let damageRoll = null;
      const weaponDamageTypes = ["physical", "breath", "fire", "frost", "poison", "piercing"];
      const otherDamageTypes = ["magic", "heal", "hull", "fall", "corrosive"];
      if (weaponDamageTypes.includes(dataset.damagetype)) {
         damageRoll = theItem.getDamageRoll(attacktype, null, targetweapontype);
      } else if (otherDamageTypes.includes(dataset.damagetype)) {
         damageRoll = theItem.getDamageRoll(null);
      }

      dialogResp = await DialogFactory({
         dialog: "generic",
         label: isHeal ? "Heal" : "Damage",
         formula: damageRoll.formula,
         editFormula: game.user.isGM
      }, theItem);
      rolling = dialogResp != null;

      if (weaponDamageTypes.includes(dataset.damagetype)) {
         damageRoll = theItem.getDamageRoll(attacktype, dialogResp, targetweapontype);
      } else if (otherDamageTypes.includes(dataset.damagetype)) {
         damageRoll = theItem.getDamageRoll(dialogResp);
      }

      if (rolling === true) {
         // Roll the damage and wait for the result
         const roll = new Roll(damageRoll.formula);
         await roll.evaluate(); // Wait for the roll result
         const damage = Math.max(roll.total, 0);
         const attackName = (theItem.system.isIdentified !== false) ? theItem.name : theItem.system.unidentifiedName;
         const descData = {
            attacker: instigator.name,
            weapon: attackName,
            damage
         };
         const resultString = isHeal ? game.i18n.format('FADE.Chat.healFlavor', descData) : game.i18n.format('FADE.Chat.damageFlavor2', descData);
         dataset.desc = dataset.desc ? dataset.desc : resultString;

         const chatData = {
            context: instigator,
            mdata: dataset,
            roll: roll,
            digest: damageRoll.digest
         };
         const options = {
            damage: damage,
            resultString,
            attackName,
         };
         const builder = new DamageRollChatBuilder(chatData, options);
         builder.createChatMessage();
      }
   }

   /**
    * Click event handler for apply damage/heal buttons.
    * @param {any} ev
    */
   static async clickApplyDamage(ev) {
      const element = ev.currentTarget;
      const dataset = element.dataset;
      const weapon = await fromUuid(dataset.weaponuuid);
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
         let delta = parseInt(dataset.amount, 10);
         for (let target of applyTo) {
            if (target.actor.isOwner === true) {
               //// If not restoring HP
               //if (dataset.damageType != "heal") {
               //   // Convert positive damage to delta of negative HP.
               //   delta = -delta;
               //}
               // Apply damage to the token's actor
               const dmgSys = game.fade.registry.getSystem("damageSystem");
               dmgSys.ApplyDamage(target.actor, delta, dataset.damagetype, dataset.attacktype, weapon);
            }
         }
      }
   }
}
