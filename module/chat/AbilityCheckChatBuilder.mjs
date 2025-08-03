import { ChatBuilder } from './ChatBuilder.mjs';

export class AbilityCheckChatBuilder extends ChatBuilder {
   static template = "dummy";

   async createChatMessage() {
      console.debug(this.data);
      const { caller, context, mdata, roll, options } = this.data;
      const abilityCheckSys = await game.fade.registry.getSystem("abilityCheck");
      const rolls = [roll];
      const rollContent = await roll.render();
      let resultString;

      mdata.score = caller.system.abilities[mdata.ability].total;

      if (options.showResult !== false) {
         resultString = abilityCheckSys.getResultString(this, {
            roll,
            target: mdata.score,
            operator: mdata.pass,
            autosuccess: mdata.autosuccess,
            autofail: mdata.autofail,
         });
      }

      // Get the actor and user names
      const actorName = caller.name; // Actor name (e.g., character name)
      const userName = game.users.current.name; // User name (e.g., player name)
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = mdata.rollmode || game.settings.get("core", "rollMode");
      const chatData = {
         context,
         rollContent,
         mdata,
         resultString,
         actorName,
         userName,
         rollMode
      };

      if (game.fade.toastManager) {
         const abilityName = game.i18n.localize(`FADE.Actor.Abilities.${mdata.ability}.long`);
         const toast = `${actorName}: ${abilityName} check.${resultString ?? ''}`;
         game.fade.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      const content = await renderTemplate(abilityCheckSys.chatTemplate, chatData);
      const chatMessageData = this.getChatMessageData({ content, rolls });
      await ChatMessage.create(chatMessageData);
   }
}
