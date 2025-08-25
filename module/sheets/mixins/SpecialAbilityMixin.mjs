/**
 * A mixin for adding VS Group modifier support to an FDItemSheetV2 class.
 * The sheet's item class must define a createSpecialAbility async method.
 * @param {any} superclass
 * @returns
 */
const SpecialAbilityMixin = (superclass) => class extends superclass {

   /**
    * Default options for the mixin
    */
   static DEFAULT_OPTIONS = {
      actions: {
         addSpecialAbility: this._clickAddSpecialAbility,
         deleteSpecialAbility: this._clickDeleteSpecialAbility
      }
   };

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      const data = TextEditor.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);

      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === "specialAbility") {
         if (droppedItem.system.category === "save") {
         } else {
            await this.item.createSpecialAbility(droppedItem.name, droppedItem.system.classKey);
         }
      }
   }

   /**
    * Handle adding a new VS Group modifier
    * @param {Event} event The originating click event
    * @protected
    */
   static async _clickAddSpecialAbility(event) {
      event.preventDefault();
      await this.item.createSpecialAbility();
      this.render();
   }
   
   /**
    * Handle deleting a VS Group modifier
    * @param {Event} event The originating click event
    * @protected
    */
   static async _clickDeleteSpecialAbility(event) {
      event.preventDefault();
      let index;
      if (event.target.dataset.type) {
         index = parseInt(event.target.dataset.index);
      } else if (event.target.parentElement.dataset.type) {
         index = parseInt(event.target.parentElement.dataset.index);
      } else {
         console.error(`SpecialAbilityMixin._clickDeleteSpecialAbility Can"t determine item type.`, item);
      }
      const specialAbilities = [...this.item.system.specialAbilities];
      if (specialAbilities.length > index) {
         specialAbilities.splice(index, 1);
         await this.item.update({ "system.specialAbilities": specialAbilities });
      }
   }
}

export { SpecialAbilityMixin }