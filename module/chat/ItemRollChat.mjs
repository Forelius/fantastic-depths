import { ChatBuilder } from './ChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class ItemRollChat extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/item-roll.hbs';

   async getRollContent(roll, mdata) {
      if (mdata?.flavor) {
         return roll.render({ flavor: mdata.flavor });
      } else {
         return roll.render();
      }
   }

   async createChatMessage() {
      const { context, mdata, roll, caller, options } = this.data;
      let resultString = null;
      const rolls = roll ? [roll] : [];
      let rollContent = null;
      const item = caller;
      let dmgHealRoll = { hasDamage: false };
      const targetTokens = Array.from(game.user.targets);

      if (item?.getDamageRoll && options?.isUsing === true) {
         dmgHealRoll = item?.getDamageRoll(null);
      }

      if (roll && options.showResult !== false) {
         rollContent = await this.getRollContent(roll, mdata);
         // Ensure the target number is a number
         const targetNumber = Number(mdata.target);
         // Determine the roll result based on the provided data
         resultString = this.getResultString(mdata, roll, targetNumber);
      }

      // Get the actor and user names
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata?.rollmode || game.settings.get("core", "rollMode");

      if (roll) {
         this.handleToast(actorName, mdata, roll, resultString, rollMode);
      }

      let actions = [];
      if (options?.isUsing === true) {
         actions = await this._setupActions(item, context);
      }

      // Prepare data for the chat template
      const chatData = {
         // Only specify caller if an item.
         item,
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         actions // only saving throws are used here.
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      const damageRoll = dmgHealRoll.damageType === "heal" ? undefined : dmgHealRoll;
      const healRoll = dmgHealRoll.damageType === "heal" ? dmgHealRoll : undefined;

      // Prepare chat message data, including rollMode from mdata
      const chatMessageData = this.getChatMessageData({
         content,
         rolls,
         rollMode, // Pass the determined rollMode
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: item.uuid,
               targets: targetTokens.map(i => ({ targetid: i.id, targetname: i.name })),
               damageRoll,
               healRoll, 
               actions,
               conditions: options?.conditions,
            }
         }
      });

      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }

   handleToast(actorName, mdata, roll, resultString, rollMode) {
      if (game.fade.toastManager) {
         let toast = `${actorName}: ${mdata?.label ?? ''}${mdata?.desc ?? ''}`;
         toast += `<div>Roll: ${roll.total}</div>`;
         if (resultString) toast += `<div>${resultString}</div>`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }
   }

   getResultString(mdata, roll, targetNumber) {
      let resultString = null;
      if (mdata.pass !== undefined && mdata.pass !== null) {
         const testResult = this.getBoolRollResultType({
            roll,
            target: targetNumber,
            operator: mdata.pass,
            autofail: mdata.autofail,
            autosuccess: mdata.autosuccess
         });
         resultString = this.getBoolResultHTML(testResult);
      } else if (mdata.resultstring !== undefined && mdata.resultstring !== null) {
         resultString = mdata.resultstring;
      }
      return resultString;
   }
}