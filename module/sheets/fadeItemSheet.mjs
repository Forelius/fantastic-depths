import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Base sheet class for fadeItem.
 */
export class fadeItemSheet extends ItemSheet {
   
   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);
      const itemData = context.data;
      const rollData = this.item.getRollData();
      // Enrich description info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      context.enrichedDesc = await TextEditor.enrichHTML(this.item.system.description, {
         secrets: this.document.isOwner,
         // Necessary in v11, can be removed in v12
         rollData,
         relativeTo: this.item,
      });
      context.enrichedUIDesc = await TextEditor.enrichHTML(this.item.system.unidentifiedDesc, {
         secrets: this.document.isOwner,
         rollData,
         relativeTo: this.item,
      });
      context.system = itemData.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }

   get title() {
      return game.user.isGM || this.item.system.isIdentified ? this.item.name : this.item.system.unidentifiedName;
   }

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (this.isEditable) {
         // Active Effect management
         html.on('click', '.effect-control', (ev) =>
            EffectManager.onManageActiveEffect(ev, this.item)
         );
         html.find('input[data-action="add-tag"]').keypress((ev) => {
            if (ev.which === 13) {
               const value = $(ev.currentTarget).val();
               this.object.tagManager.pushTag(value);
            }
         });
         html.find(".tag-delete").click((ev) => {
            const value = ev.currentTarget.parentElement.dataset.tag;
            this.object.tagManager.popTag(value);
         });
      }
   }
}
