import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatBuilder } from './ChatBuilder.mjs';

export class DamageRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/damage-roll.hbs';

   async getRollContent(roll, mdata) {
      return roll.render();
   }

   async createChatMessage() {
      const { context, mdata, resp, roll, options, digest } = this.data;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);

      // Get the actor and user names
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      // First, create an empty message to get the message ID
      const tempMessage = await ChatMessage.create({
         content: "",  // Temporary empty content
         rolls: rolls,  // Pass the roll(s) directly in the rolls field
         rollMode
      });

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
         messageId: tempMessage.id, // Pass the message ID into the render data
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

      // Update the temporary chat message with the final content and roll data
      await tempMessage.update({
         content,  // Set the final content including the message ID
         rolls,    // Attach roll data
         [`flags.${game.system.id}.resultString`]: options.resultString,  // Store resultString in the flags
      });
   }

   /**
   * Handle user clicking on element with .damage-roll css class.
   * @param {any} ev
   */
   static async clickDamageRoll(ev) {
      const element = ev.currentTarget;
      const dataset = element.dataset;
      const { attackerid, weaponid, attacktype, damagetype } = dataset;

      // Custom behavior for damage rolls      
      if (dataset.type === "damage") {
         ev.preventDefault(); // Prevent the default behavior
         ev.stopPropagation(); // Stop other handlers from triggering the event

         await DamageRollChatBuilder.handleDamageRoll(ev, dataset);
      }
   }

   static async handleDamageRoll(ev, dataset) {
      const { attackerid, weaponid, attacktype, attackmode, damagetype } = dataset;
      const attackerToken = canvas.tokens.get(attackerid);
      let weaponItem = attackerToken.actor.items.find((item) => item.id === weaponid);
      let canRoll = true;
      let dialogResp = null;

      try {
         dialogResp = await DialogFactory({ dialog: 'generic', label: "Damage" }, weaponItem);
         if (!dialogResp?.resp) {
            canRoll = false;
         }
      } catch (error) {
         // Close button pressed or other error
         canRoll = false;
      }

      let damageRoll = null;
      if (dataset.damagetype === "physical") {
         damageRoll = weaponItem.getDamageRoll(attacktype, attackmode, dialogResp?.resp);
      } else if (dataset.damagetype === "magic") {
         damageRoll = weaponItem.getDamageRoll(dialogResp?.resp);
      }

      if (canRoll === true) {
         // Roll the damage and wait for the result
         const roll = new Roll(damageRoll.formula);
         await roll.evaluate(); // Wait for the roll result
         const damage = Math.max(roll.total, 0);
         const descData = {
            attacker: attackerToken.name,
            weapon: weaponItem.name,
            damage
         };
         const resultString = game.i18n.format('FADE.Chat.damageFlavor2', descData);

         const chatData = {
            context: attackerToken,
            mdata: dataset,
            roll: roll,
            digest: damageRoll.digest
         };
         const options = {
            damage: damage,
            resultString,
            attackName: weaponItem.name,
         };
         const builder = new DamageRollChatBuilder(chatData, options);
         builder.createChatMessage();
      }
   }

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

      if (hasTarget && hasSelected) {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: "Select Targeted or Selected",
            content: "Do you want to apply damage to targeted or selected?",
            yesLabel: "Targeted",
            noLabel: "Selected",
            defaultChoice: "yes"
         }, attackerToken);

         if (dialogResp?.resp?.result === true) {
            hasSelected = false;
         } else if (dialogResp?.resp?.result === false) {
            hasTarget = false;
         }
      }

      if (hasTarget) {
         applyTo = targeted;
      } else if (hasSelected) {
         applyTo = selected;
      } else {
         ui.notifications.warn("Select or target the token(s) you are applying damage to.");
      }

      // Ensure we have a target ID
      if (applyTo.length > 0) {
         for (let target of applyTo) {
            // Apply damage to the token's actor
            target.actor.applyDamage(parseInt(dataset.amount, 10), dataset.damagetype, weapon);
         }
      }
   }

   static async updateChatMessageWithApplyDamage(updatedFields) {
      let { dataset, chatMessage, showApplyDamage, rollContent, targetName, resultString } = updatedFields;

      // Prepare data for the chat template
      const renderData = {
         rollContent,
         mdata: {
            ...dataset,
            showApplyDamage, // Dynamically set showApplyDamage
         },
         actorName: targetName,
         resultString,
         damage: dataset.amount,
         targetid: dataset.targetid,
         messageId: chatMessage.id,
      };

      // Render the content
      const content = await renderTemplate(DamageRollChatBuilder.template, renderData);

      // Update the chat message with the new content
      await chatMessage.update({ content });
   }
}
