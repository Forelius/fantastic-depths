import { ChatBuilder } from './ChatBuilder.mjs';

export class SpellCastChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/spell-cast.hbs';

   // The currently selected target, if any.
   #targetTokens;

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
      this.#targetTokens = game.user.targets; // The selected tokens
   }

   /**
   * Called by the various Actor and Item derived classes to create a chat message.
   */
   async createChatMessage() {
      const { context, caller, options } = this.data;
      const targetNamesArray = Array.from(this.#targetTokens).map(target => target.name).filter(Boolean);
      const targetIdsArray = Array.from(this.#targetTokens).map(target => target.id).filter(Boolean);
      const targetNames = targetNamesArray.length > 1
         ? targetNamesArray.slice(0, -1).join(", ") + " and " + targetNamesArray.slice(-1)
         : targetNamesArray[0] || "";

      const damageRoll = caller.getDamageRoll();

      // Prepare data for the chat template
      const chatData = {
         caller,
         context,
         targetNames,
         hasTarget: (targetNamesArray.length > 0),
         targetids: targetIdsArray?.join(","),
         damageRoll,
         damageType: "magic"
      };

      // Render the content using the template
      const content = await renderTemplate(this.template, chatData);
      // Determine rollMode (use mdata.rollmode if provided, fallback to default)
      const rollMode = game.settings.get("core", "rollMode");
      const descData = { caster: context.name, spell: caller.name, targetNames };
      const description = chatData.hasTarget ? game.i18n.format('FADE.Chat.spellCast1', descData) : game.i18n.format('FADE.Chat.spellCast2', descData);

      if (window.toastManager) {
         let toast = `${description}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      const chatMessageData = await this.getChatMessageData({ content, rollMode });
      await ChatMessage.create(chatMessageData);     
   }
}