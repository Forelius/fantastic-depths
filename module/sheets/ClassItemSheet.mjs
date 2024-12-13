/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ClassItemSheet extends ItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 650,
         height: 480,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'levels',
            },
         ],
      });
   }

   /** @override */
   get isEditable() {
      // Allow editing only for GM users
      return game.user.isGM;
   }

   /** @override */
   get template() {
      const path = 'systems/fantastic-depths/templates/item';
      return `${path}/class-sheet.hbs`;
   }

   /** @override */
   getData() {
      // Retrieve base data structure
      const context = super.getData();
      const itemData = context.data;

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;

      // Add the item's data for easier access
      context.system = itemData.system;
      context.flags = itemData.flags;
      context.isSpellcaster = itemData.system.maxSpellLevel > 0;
      // Generate spell level headers
      context.spellLevelHeaders = [];
      for (let i = 1; i <= itemData.system.maxSpellLevel; i++) {
         context.spellLevelHeaders.push(`Spell Level ${i}`);
      }

      return context;
   }

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Add Inventory Item
      html.on('click', '.item-create', async (event) => { await this.#onCreateChild(event) });

      // Delete Inventory Item
      html.on('click', '.item-delete', async (event) => { await this.#onDeleteChild(event) });
   }
  
   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   async #onCreateChild(event) {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      console.debug(`ClasItemSheet._onCreateChild: ${type}`);
      if (type === 'classSave') {
         this.item.createClassSave();
      } else if (type === 'primeReq') {
         this.item.createPrimeReq();
      }
      this.render();
   }

   async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.currentTarget.dataset.type;
      const index = parseInt(event.currentTarget.dataset.index);

      if (type === 'classSave') {
         // Handle deletion of a class save
         this.item.system.saves.splice(index, 1);
         await this.item.update({ "system.saves": saves });
      } else if (type === 'primeReq') {
         const primeReqs = this.item.system.primeReqs;
         if (primeReqs.length > index) {
            primeReqs.splice(index, 1);
            await this.item.update({ "system.primeReqs": primeReqs });
            this.render();
         }
      }
      this.render();
   }
}