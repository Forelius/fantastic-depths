import {
   onManageActiveEffect,
   prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class fadeItemSheet extends ItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 520,
         height: 450,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'attributes',
            },
         ],
      });
   }

   /** @override */
   render(force, options = {}) {
      // Adjust options before rendering based on item type
      if (this.item.type === 'armor') {
         options.width = 460;
         options.height = 340;
      } else if (this.item.type === "weapon") {
         options.width = 460;
         options.height = 340;
      } else {
         options.width = 460;
         options.height = 400;
      }

      // Call the original render method with modified options
      return super.render(force, options);
   }

   /** @override */
   get template() {
      const path = 'systems/fantastic-depths/templates/item';
      return `${path}/${this.item.type}-sheet.hbs`;
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

      // Add the item's data to context.data for easier access, as well as flags.
      context.system = itemData.system;
      context.flags = itemData.flags;

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;

      // Prepare active effects for easier access
      context.effects = prepareActiveEffectCategories(this.item.effects);

      // Is this user the game master?
      context.isGM = game.user.isGM;

      return context;
   }

   /* -------------------------------------------- */

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Roll handlers, click handlers, etc. would go here.

      // Active Effect management
      html.on('click', '.effect-control', (ev) =>
         onManageActiveEffect(ev, this.item)
      );

      html.find('input[data-action="add-tag"]').keypress((ev) => {
         if (ev.which === 13) {
            const value = $(ev.currentTarget).val();
            this.object.pushTag(value);
         }
      });
      html.find(".tag-delete").click((ev) => {
         const value = ev.currentTarget.parentElement.dataset.tag;
         this.object.popTag(value);
      });
   }
}