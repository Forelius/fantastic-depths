import { ChatBuilder } from './ChatBuilder.mjs';

export class DamageRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/damage-roll.hbs';

   async getRollContent(roll, mdata) {
      if (mdata.flavor) {
         return roll.render({ flavor: mdata.flavor });
      } else {
         return roll.render();
      }
   }

   async createChatMessage() {
      const { context, mdata, resp, roll, options } = this.data;
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
         targetid: options.targetid,
         messageId: tempMessage.id, // Pass the message ID into the render data
      };

      if (window.toastManager) {
         let toast = `${options.resultString}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      // Render the content using the template, now with messageId
      const content = await renderTemplate(this.template, renderData);
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

      // Custom behavior for damage rolls
      if (dataset.type === "damage") {
         ev.preventDefault(); // Prevent the default behavior
         ev.stopPropagation(); // Stop other handlers from triggering the event
         const { attackerid, attacker, targetname, weapon, targetid } = dataset;

         // Roll the damage and wait for the result
         const roll = new Roll(dataset.formula);
         await roll.evaluate(); // Wait for the roll result
         const damage = Math.max(roll.total, 0);
         let descData = targetname ? { attacker, targetname, weapon, damage } : { attacker, weapon, damage };
         let resultString = targetname ? game.i18n.format('FADE.Chat.damageFlavor1', descData) : game.i18n.format('FADE.Chat.damageFlavor2', descData);
         
         const chatData = {
            context: game.actors.get(attackerid),
            mdata: dataset,
            roll: roll,
         };
         const options = {
            targetid,
            damage: damage,
            resultString,
            showApplyDamage: targetid && damage > 0
         }
         const builder = new DamageRollChatBuilder(chatData, options);
         builder.createChatMessage();
      }
   }

   static async clickApplyDamage(ev) {
      const element = ev.currentTarget;
      const dataset = element.dataset;
      element.disabled = true;

      // Ensure we have a target ID
      if (dataset.targetid) {
         // Get the token from the scene by its token ID
         let targetToken = canvas.tokens.get(dataset.targetid);

         // Ensure the token exists and fetch the associated actor
         if (targetToken) {
            let targetActor = targetToken.actor; // Get the actor associated with the token

            // Apply damage to the token's actor
            targetActor.applyDamage(parseInt(dataset.amount, 10), dataset.attacktype);

            // Retrieve the chat message by its message ID
            const chatMessage = game.messages.get(dataset.messageid);

            if (chatMessage) {
               // Retrieve resultString from the message flags
               const resultString = chatMessage.getFlag(game.system.id, "resultString");
               // Re-render the chat message with showApplyDamage set to false
               const rollContent = await chatMessage.rolls[0].render();  // Use render() to get HTML
               await DamageRollChatBuilder.updateChatMessageWithApplyDamage(dataset, chatMessage, false, rollContent, targetActor.name, resultString);

            } else {
               ui.notifications.warn('Chat message not found.');
            }
         } else {
            ui.notifications.warn('Target token was specified, but no longer exists.');
         }
      } else {
         ui.notifications.warn(`Target token was not specified.`);
      }
   }

   static async updateChatMessageWithApplyDamage(dataset, chatMessage, showApplyDamage, rollContent, targetName, resultString) {
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
      await chatMessage.update({
         content,
      });
   }
}
