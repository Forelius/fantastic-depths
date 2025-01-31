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
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      // Prepare data for the chat template, including the message ID
      const renderData = {
         rollContent,
         mdata,
         actorName,
         userName,
         resultString: options.resultString,
         damage: options.damage,
         showApplyDamage: options.showApplyDamage,
         attackName: options.attackName,
         digest
      };

      if (window.toastManager) {
         let toast = `${options.resultString}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      // Render the content using the template, now with messageId
      let content = await renderTemplate(this.template, renderData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const chatMessageData = await this.getChatMessageData({
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
      const { attackerid, weaponid, attacktype, attackmode, damagetype, targetweapontype } = dataset;
      const attacker = canvas.tokens.get(attackerid) || game.actors.get(attackerid);
      const attackerActor = attacker.actor ?? attacker;
      const weaponItem = attackerActor.items.find(item => item.id === weaponid);
      let canRoll = true;
      let dialogResp = null;
      const isHeal = damagetype === 'heal';

      try {
         dialogResp = await DialogFactory({ dialog: 'generic', label: isHeal ? "Heal" : "Damage" }, weaponItem);
         if (!dialogResp?.resp) {
            canRoll = false;
         }
      } catch (error) {
         // Close button pressed or other error
         canRoll = false;
      }

      let damageRoll = null;
      const damageTypes = ["physical", "breath", "fire", "frost", "poison"];
      const spellType = ["magic", "heal"];
      if (damageTypes.includes(dataset.damagetype)) {
         damageRoll = await weaponItem.getDamageRoll(attacktype, attackmode, dialogResp?.resp, targetweapontype);
      } else if (spellType.includes(dataset.damagetype)) {
         damageRoll = await weaponItem.getDamageRoll(dialogResp?.resp);
      }

      if (canRoll === true) {
         // Roll the damage and wait for the result
         const roll = new Roll(damageRoll.formula);
         await roll.evaluate(); // Wait for the roll result
         const damage = Math.max(roll.total, 0);
         const attackName = weaponItem.system.isIdentified ? weaponItem.name : weaponItem.system.unidentifiedName;
         const descData = {
            attacker: attacker.name,
            weapon: attackName,
            damage
         };
         const resultString = isHeal ? game.i18n.format('FADE.Chat.healFlavor', descData) : game.i18n.format('FADE.Chat.damageFlavor2', descData);

         const chatData = {
            context: attacker,
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
      const attackerToken = canvas.tokens.get(dataset.attackerid);
      const weapon = attackerToken?.actor.items.find((item) => item.id === dataset.weaponid);
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
         }, attackerToken);

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
         for (let target of applyTo) {
            // Apply damage to the token's actor
            target.actor.applyDamage(parseInt(dataset.amount, 10), dataset.damagetype, weapon);
         }
      }
   }
}
