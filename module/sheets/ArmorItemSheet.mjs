import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Sheet class for ArmorItem.
 */
export class ArmorItemSheet extends ItemSheet {
   /**
    * Get the default options for the MasteryDefinitionItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/ArmorItemSheet.hbs",
         width: 540,
         height: 340,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'attributes',
            },
         ],
      });
   }

   ///** @override */
   //get isEditable() {
   //   // Allow editing only for GM users
   //   return this.item.isOwner;
   //}

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = super.getData(options);
      const itemData = context.data;
      // Enrich description info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      context.enrichedDescription = await TextEditor.enrichHTML(
         this.item.system.description,
         {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Necessary in v11, can be removed in v12
            async: true,
            // Data to fill in for inline rolls
            rollData: this.item.getRollData(),
            // Relative UUID resolution
            relativeTo: this.item,
         }
      );
      context.system = itemData.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      context.isBasicEnc = game.settings.get(game.system.id, "encumbrance") === "basic";
      if (context.isBasicEnc === true) {
         let encOptions = [];
         encOptions.push({ text: game.i18n.localize('FADE.Armor.armorWeight.choices.none'), value: "none" });
         encOptions.push({ text: game.i18n.localize('FADE.Armor.armorWeight.choices.light'), value: "light" });
         encOptions.push({ text: game.i18n.localize('FADE.Armor.armorWeight.choices.heavy'), value: "heavy" });
         context.encOptions = encOptions;
      }

      return context;
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
