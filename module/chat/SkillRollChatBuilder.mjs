import { GenericRollChatBuilder } from './GenericRollChatBuilder.mjs';
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class SkillRollChatBuilder extends GenericRollChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/skill-roll.hbs';

   async createChatMessage() {
      const { context, mdata, roll, caller, options } = this.data;
      const actor = context;
      const rolls = [roll];
      const rollContent = await this.getRollContent(roll, mdata);
      const dmgHealRoll = caller.getDamageRoll(null);
      let targetNumber = Number(mdata.target); // Ensure the target number is a number
      const targetTokens = Array.from(game.user.targets);

      // Determine the roll result based on the provided data
      let resultString;
      if (options.showResult !== false) {
         resultString = this.getResultString(mdata, roll, targetNumber);
      }

      // Get the actor and user names
      const actorName = actor.token?.name ?? actor.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)

      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");

      this.handleToast(actorName, mdata, roll, resultString, rollMode);

      // Prepare data for the chat template
      const chatData = {
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         context, // the skill's owning actor
         item: caller,
         itemDescription: await caller.getInlineDescription(),
         attackType: 'skill'
      };
      // Render the content using the template
      const content = await CodeMigrate.RenderTemplate(this.template, chatData);

      // Prepare chat message data, including rollMode from mdata
      const damageRoll = dmgHealRoll.damageType === "heal" ? undefined : dmgHealRoll;
      const healRoll = dmgHealRoll.damageType === "heal" ? dmgHealRoll : undefined;
      const chatMessageData = this.getChatMessageData({
         caller,
         content,
         rolls,
         rollMode, // Pass the determined rollMode
         flags: {
            [game.system.id]: {
               owneruuid: context.uuid,
               itemuuid: caller.uuid,
               targets: targetTokens.map(i => ({ targetid: i.id, targetname: i.name })),
               damageRoll,
               healRoll,
            }
         }
});

      // Create the chat message
      await ChatMessage.create(chatMessageData);
   }
}
