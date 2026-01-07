import { FDItemSheetV2 } from "./FDItemSheetV2";

/**
 * A class for adding spells to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
export class SpellSheetService {
   static DEFAULT_OPTIONS = {
      actions: {
         deleteSpell: SpellSheetService.clickDeleteSpell
      }
   };

   /**
    * Handle deleting a spell
    * @param {any} event The originating click event
    */
   static async clickDeleteSpell(this: FDItemSheetV2, event) {
      event.preventDefault();
      let index;
      if (event.target.dataset.type) {
         index = parseInt(event.target.dataset.index);
      } else if (event.target.parentElement.dataset.type) {
         index = parseInt(event.target.parentElement.dataset.index);
      } else {
         console.error(`SpellMixin.clickDeleteSpell can't determine item type.`, event);
      }
      const spells = [...this.item.system.spells];
      if (spells.length > index) {
         spells.splice(index, 1);
         await this.item.update({ "system.spells": spells });
      }
   }

   /**
    * Creates a spell child item for this item.
    * @param {any} droppedItem
    */
   async onDropSpellItem(item, droppedItem) {
      // Retrieve the array
      const spells = [...item.system.spells || []];

      // Define the new data
      const newItem = {
         action: "none",
         castAs: "",
         name: droppedItem?.name ?? "",
         uuid: droppedItem?.uuid ?? "",
      };

      // Add the new item to the array
      spells.push(newItem);
      await item.update({ "system.spells": spells });
   }
}