/**
 * A mixin for adding VS Group modifier support to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
const SpellMixin = (superclass) => {
   class SpellMixinClass extends superclass {
      /**
       * Handle adding a new spell
       * @param {Event} event The originating click event
       * @protected
       */
      static async _clickAddSpell(event) {
         event.preventDefault();
         await this.createSpell();
      }

      /**
       * Handle deleting a spell
       * @param {Event} event The originating click event
       * @protected
       */
      static async _clickDeleteSpell(event) {
         event.preventDefault();
         let index;
         if (event.target.dataset.type) {
            index = parseInt(event.target.dataset.index);
         } else if (event.target.parentElement.dataset.type) {
            index = parseInt(event.target.parentElement.dataset.index);
         } else {
            console.error(`SpellMixin._clickDeleteSpell can't determine item type.`, item);
         }
         const spells = [...this.item.system.spells];
         if (spells.length > index) {
            spells.splice(index, 1);
            await this.item.update({ "system.spells": spells });
         }
         this.render();
      }

      /**
       * Creates a spell child item for this item.
       * @param {any} name
       * @param {any} classKey
       */
      async createSpell(item) {
         // Retrieve the array
         const spells = [...this.item.system.spells || []];

         // Define the new data
         const newItem = {
            castAs: "",
            name: item?.name ?? "",
            uuid: item?.uuid ?? "",
         };

         // Add the new item to the array
         spells.push(newItem);
         await this.item.update({ "system.spells": spells });
      }
   }

   SpellMixinClass.DEFAULT_OPTIONS = {
      actions: {
         addSpell: SpellMixinClass._clickAddSpell,
         deleteSpell: SpellMixinClass._clickDeleteSpell
      }
   };

   return SpellMixinClass;
};

export { SpellMixin }