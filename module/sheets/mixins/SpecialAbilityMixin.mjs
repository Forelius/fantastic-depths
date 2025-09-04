/**
 * A mixin for adding VS Group modifier support to an FDItemSheetV2 class.
 * The sheet's item class must define a createSpecialAbility async method.
 * @param {any} superclass
 * @returns
 */
const SpecialAbilityMixin = (superclass) => {
   class SpecialAbilityMixinClass extends superclass {

      /**
       * Handle adding a new special ability
       * @param {Event} event The originating click event
       * @protected
       */
      static async _clickAddSpecialAbility(event) {
         event.preventDefault();
         await this.createSpecialAbility();
      }

      /**
       * Handle deleting a special ability
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
            console.error(`SpecialAbilityMixin._clickDeleteSpecialAbility Can't determine item type.`, item);
         }
         const specialAbilities = [...this.item.system.specialAbilities];
         if (specialAbilities.length > index) {
            specialAbilities.splice(index, 1);
            await this.item.update({ "system.specialAbilities": specialAbilities });
         }
         this.render();
      }

      /**
       * Creates a special ability child item for this item.
       * @param {any} name
       * @param {any} classKey
       */
      async createSpecialAbility(item) {
         // Retrieve the array
         const specialAbilities = [...this.item.system.specialAbilities || []];

         // Define the new data
         const newItem = {
            level: 1,
            name: item?.name ?? "",
            uuid: item?.uuid ?? "",
            target: item?.system.target,
            changes: "",
            classKey: item?.system.classKey ?? ""
         };

         // Add the new item to the array
         specialAbilities.push(newItem);
         await this.item.update({ "system.specialAbilities": specialAbilities });
      }

   }

   SpecialAbilityMixinClass.DEFAULT_OPTIONS = {
      actions: {
         addSpecialAbility: SpecialAbilityMixinClass._clickAddSpecialAbility,
         deleteSpecialAbility: SpecialAbilityMixinClass._clickDeleteSpecialAbility
      }
   };

   return SpecialAbilityMixinClass;
};

export { SpecialAbilityMixin }