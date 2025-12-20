import { ChatBuilder } from './ChatBuilder.js';
import { CodeMigrate } from "../sys/migration.js";

export class GenericRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/generic-roll.hbs';

   async getRollContent(roll, mdata) {
      if (mdata?.flavor) {
         return roll.render({ flavor: mdata.flavor });
      } else {
         return roll.render();
      }
   }

   async createChatMessage() {
      const { context, mdata, roll, caller, options, digest } = this.data;
      let resultString = null;
      const rolls = roll ? [roll] : [];
      let rollContent = null;
      const actors = ["character", "monster", "vehicle"];
      const item = actors.includes(caller.type) ? null : caller;
      const dmgHealRoll = null;
      const isSave = item?.system?.category === "save";
      //if (isSave == false && item?.getDamageRoll && options?.isUsing === true) {
      //   dmgHealRoll = item?.getDamageRoll(null);
      //}

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

      const actions = await this._getActionsForChat(item, context, { saves: false, attacks: false, abilities: false });

      // Prepare data for the chat template
      const chatData = {
         // Only specify caller if an item.
         item,
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         isGM: game.user.isGM,
         actions,
         digest
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      let targetTokens;
      if (item?.hasTargets === true) {
         targetTokens = isSave ? [] : Array.from(game.user.targets).map((i: PropertyBag) => (i.document ?? i) as Token);
      }
      const { damageRoll, healRoll } = this._getDamageHealRolls(dmgHealRoll);

      // Prepare chat message data, including rollMode from mdata
      const chatMessageData = this.getChatMessageData({
         content,
         rolls,
         rollMode, // Pass the determined rollMode
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: item?.uuid,
               targets: targetTokens?.map(i => ({ targetuuid: i.uuid, targetname: i.name })),
               damageRoll,
               healRoll,
               actions
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