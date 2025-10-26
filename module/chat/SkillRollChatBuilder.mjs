import { GenericRollChatBuilder } from './GenericRollChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class SkillRollChatBuilder extends GenericRollChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/skill-roll.hbs';

   async createChatMessage() {
      const { context, mdata, roll, caller, options, digest } = this.data;
      const token = context;
      const item = caller;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);
      const dmgHealRoll = item.getDamageRoll(null);
      let targetNumber = Number(mdata.target); // Ensure the target number is a number
      const targetTokens = item.hasTargets ? Array.from(game.user.targets) : null;

      // Determine the roll result based on the provided data
      let resultString;
      if (options.showResult !== false) {
         resultString = this.getResultString(mdata, roll, targetNumber);
      }

      // Get the token and user names
      const tokenName = token?.name ;
      const userName = game.users.current.name; // User name (e.g., player name)

      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      this.handleToast(tokenName, mdata, roll, resultString, rollMode);

      // Prepare data for the chat template
      const chatData = {
         rollContent,
         mdata,
         resultString,
         tokenName,
         userName,
         context, // the skill's owning actor
         item,
         itemDescription: await item.getInlineDescription(),
         attackType: 'skill',
         digest
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      const { damageRoll, healRoll } = this._getDamageHealRolls(dmgHealRoll);

      // Prepare chat message data, including rollMode from mdata
      const chatMessageData = this.getChatMessageData({
         caller,
         content,
         rolls,
         rollMode, // Pass the determined rollMode
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: item.uuid,
               targets: targetTokens?.map(i => ({ targetid: i.id, targetname: i.name })),
               damageRoll,
               healRoll,
            }
         }
      });

      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }
}
