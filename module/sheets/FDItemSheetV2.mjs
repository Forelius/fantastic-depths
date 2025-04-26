const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Base sheet class for fadeItem.
 */
export class FDItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
   get title() {
      return game.user.isGM || this.item.system.isIdentified ? this.item.name : this.item.system.unidentifiedName;
   }

   static DEFAULT_OPTIONS = {
      classes: ['fantastic-depths', 'sheet', 'item'],
      actions: {
         deleteTag: FDItemSheetV2.#clickDeleteTag,
         createEffect: FDItemSheetV2.#clickEffect,
         editEffect: FDItemSheetV2.#clickEffect,
         deleteEffect: FDItemSheetV2.#clickEffect,
         toggleEffect: FDItemSheetV2.#clickEffect,
         editImage: FDItemSheetV2.#onEditImage
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
         const inputField = this.element.querySelector('input[data-action="addTag"]');
         inputField?.addEventListener('keydown', (event) => {
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
      const tag = event.target.closest('.tag-delete').dataset.tag;
      this.item.tagManager.popTag(tag);
   }

   /**
   * Edit a Document image.
   * @this {DocumentSheetV2}
   * @type {ApplicationClickAction}
   */
   static async #onEditImage(_event, target) {
      if ( target.nodeName !== "IMG" ) {
      throw new Error("The editImage action is available only for IMG elements.");
      }
      const attr = target.dataset.edit;
      const current = foundry.utils.getProperty(this.document._source, attr);
      const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
      const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
      const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: defaultImage ? [defaultImage] : [],
      callback: path => {
         target.src = path;
         if ( this.options.form.submitOnChange ) {
            const submit = new Event("submit");
            this.element.dispatchEvent(submit);
         }
      },
      top: this.position.top + 40,
      left: this.position.left + 10
      });
      await fp.browse();
   }
}