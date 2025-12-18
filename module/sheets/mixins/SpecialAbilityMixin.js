/**
 * A mixin for aspecial abilities to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
const SpecialAbilityMixin = (superclass) => {
    class SpecialAbilityMixinClass extends superclass {
        /**
         * Handle deleting a special ability
         * @param {any} event The originating click event
         */
        static async clickDeleteSpecialAbility(event) {
            event.preventDefault();
            let index;
            if (event.target.dataset.type) {
                index = parseInt(event.target.dataset.index);
            }
            else if (event.target.parentElement.dataset.type) {
                index = parseInt(event.target.parentElement.dataset.index);
            }
            else {
                console.error(`SpecialAbilityMixin.clickDeleteSpecialAbility can't determine item type.`, event);
            }
            const specialAbilities = [...this.item.system.specialAbilities];
            if (specialAbilities.length > index) {
                specialAbilities.splice(index, 1);
                await this.item.update({ "system.specialAbilities": specialAbilities });
            }
        }
        /**
         * Creates a special ability child item for this item.
         * @param {any} droppedItem
         */
        async onDropSpecialAbilityItem(droppedItem) {
            // Retrieve the array
            const specialAbilities = [...this.item.system.specialAbilities || []];
            // Define the new data
            const newItem = {
                action: "none",
                name: droppedItem?.name ?? "",
                uuid: droppedItem?.uuid ?? "",
                mod: 0,
                classKey: droppedItem?.system?.classKey
            };
            // Add the new item to the array
            specialAbilities.push(newItem);
            await this.item.update({ "system.specialAbilities": specialAbilities });
        }
    }
    SpecialAbilityMixinClass.DEFAULT_OPTIONS = {
        actions: {
            deleteSpecialAbility: SpecialAbilityMixinClass.clickDeleteSpecialAbility
        }
    };
    return SpecialAbilityMixinClass;
};
export { SpecialAbilityMixin };
