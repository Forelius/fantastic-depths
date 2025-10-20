/**
 * A mixin for adding Conditions to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
const ConditionMixin = (superclass) => {
   class ConditionMixinClass extends superclass {

      /**
       * Handle deleting a condition
       * @param {Event} event The originating click event
       * @protected
       */
      static async _clickDeleteCondition(event) {
         event.preventDefault();
         const index = parseInt((event.target.dataset.index ?? event.target.parentElement.dataset.index));
         const items = this.item.system.conditions;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.conditions": items });
         }
      }

      async onDropConditionItem(droppedItem) {
         const items = this.item.system.conditions || [];
         // Define the new data
         const newItem = {
            name: droppedItem.name,
            durationFormula: null,
            remove: false,
            uuid: droppedItem.uuid
         };
         // Add the new item to the array
         items.push(newItem);
         await this.item.update({ "system.conditions": items });
      }
   }

   ConditionMixinClass.DEFAULT_OPTIONS = {
      actions: {
         deleteCondition: ConditionMixinClass._clickDeleteCondition
      }
   };

   return ConditionMixinClass;
};

export { ConditionMixin }