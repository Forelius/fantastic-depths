import { EffectManager } from '../sys/EffectManager.mjs';

export class GearItemSheet extends ItemSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/item';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: `${path}/GearItemSheet.hbs`,
         width: 520,
         height: 320,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'attributes',
            },
         ],
      });
   }

   /* -------------------------------------------- */
   /** @override */
   async getData() {
      // Retrieve base data structure.
      const context = super.getData();

      // Use a safe clone of the item data for further operations.
      const itemData = this.document.toObject(false);

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

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
      // Add the item's data to context.data for easier access, as well as flags.
      context.system = itemData.system;
      context.flags = itemData.flags;
      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;
      // Is this user the game master?
      context.isGM = game.user.isGM;

      if (this.item.type === 'light') {
         const lightTypes = [];
         lightTypes.push({ value: null, text: game.i18n.localize('None') });
         lightTypes.push(...CONFIG.FADE.LightTypes.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.Item.light.lightTypes.${type}`) }
         }));
         context.lightTypes = lightTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         context.animationTypes = CONFIG.Canvas.lightAnimations;
         context.isCustom = this.item.system.light.type === 'custom';
      }

      return context;
   }

   /* -------------------------------------------- */

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