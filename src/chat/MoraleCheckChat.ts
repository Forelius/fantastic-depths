import { ChatBuilder } from './ChatBuilder.js';
import { CodeMigrate } from "../sys/migration.js";

export class AbilityCheckChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/ability-check.hbs';

   async createChatMessage() {
      const { context, mdata, roll, options, digest } = this.data;

      const rolls = [roll];
      const rollContent = await roll.render();
      let resultString;

      mdata.score = context.system.abilities[mdata.ability].total;

      if (options.showResult !== false) {
         // Determine if the roll is successful based on the roll type and target number      
         const testResult = this.getBoolRollResultType({
            roll,
            target: mdata.score,
            operator: mdata.pass
         });
         resultString = this.getBoolResultHTML(testResult);
      }

      // Get the actor and user names
      const actorName = context.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");
      const chatData = {
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         rollMode,
         digest
      };

      if (game.fade.toastManager) {
         const abilityName = game.i18n.localize(`FADE.Actor.Abilities.${mdata.ability}.long`);
         let toast = `${actorName}: ${abilityName} check.${resultString ?? ''}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      const content = await CodeMigrate.RenderTemplate(this.template, chatData);
      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}

