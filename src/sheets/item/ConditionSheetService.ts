import { FDItemSheetV2 } from "./FDItemSheetV2";

/**
 * A class adding Conditions to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
export class ConditionSheetService {

   static DEFAULT_OPTIONS = {
      actions: {
         deleteCondition: ConditionSheetService.clickDeleteCondition
      }
   }

   /**
    * Handle deleting a condition
    * @param {any} event The originating click event
    */
   static async clickDeleteCondition(this: FDItemSheetV2, event) {
      event.preventDefault();
      const index = parseInt((event.target.dataset.index ?? event.target.parentElement.dataset.index));
      const items = this.item.system.conditions;
      if (items.length > index) {
         items.splice(index, 1);
         await this.item.update({ "system.conditions": items });
      }
   }

   async onDropConditionItem(item, droppedItem) {
      const items = item.system.conditions || [];
      // Define the new data
      const newItem = {
         name: droppedItem.name,
         durationFormula: null,
         remove: false,
         uuid: droppedItem.uuid
      };
      // Add the new item to the array
      items.push(newItem);
      await item.update({ "system.conditions": items });
   }
}