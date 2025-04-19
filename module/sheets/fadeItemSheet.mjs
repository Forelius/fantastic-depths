const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Base sheet class for fadeItem.
 */
export class fadeItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
   get title() {
      return game.user.isGM || this.item.system.isIdentified ? this.item.name : this.item.system.unidentifiedName;
   }

   static DEFAULT_OPTIONS = {
      classes: ['fantastic-depths', 'sheet', 'item'],
      actions: {
         deleteTag: fadeItemSheet.#clickDeleteTag,
         createEffect: fadeItemSheet.#clickEffect,
         editEffect: fadeItemSheet.#clickEffect,
         deleteEffect: fadeItemSheet.#clickEffect,
         toggleEffect: fadeItemSheet.#clickEffect,
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const rollData = this.item.getRollData();
      // Enrich description info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      context.enrichedDesc = await TextEditor.enrichHTML(this.item.system.description, {
         secrets: this.document.isOwner,
         // Necessary in v11, can be removed in v12
         rollData,
         relativeTo: this.item,
      });
      if (this.item.system.unidentifiedDesc !== undefined) {
         context.enrichedUIDesc = await TextEditor.enrichHTML(this.item.system.unidentifiedDesc, {
            secrets: this.document.isOwner,
            rollData,
            relativeTo: this.item,
         });
      }
      context.item = this.item;
      context.system = this.item.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;
      return context;
   }

   /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param {ApplicationRenderContext} context      Prepared context data
     * @param {RenderOptions} options                 Provided render options
     * @protected
     */
   _onRender(context, options) {    
      if (this.isEditable) {
         const inputField = this.element.querySelector('input[data-action="add-tag"]');
         inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { // Check if the Enter key is pressed
               const value = event.currentTarget.value; // Get the value of the input
               this.item.tagManager.pushTag(value); // Push the value to the tag manager
            }
         });
      }
   }

   static async #clickEffect(event) {
      await EffectManager.onManageActiveEffect(event, this.item)
   }

   static #clickDeleteTag(event) {
      const value = event.target.parentElement.dataset.tag;
      this.item.tagManager.popTag(value);
   }
}