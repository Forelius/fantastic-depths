/**
 * A mixin for adding spells to an FDItemSheetV2 class.
 * @param {any} superclass
 * @returns
 */
const SpellMixin = (superclass) => {
    class SpellMixinClass extends superclass {
        /**
         * Handle deleting a spell
         * @param {any} event The originating click event
         */
        static async clickDeleteSpell(event) {
            event.preventDefault();
            let index;
            if (event.target.dataset.type) {
                index = parseInt(event.target.dataset.index);
            }
            else if (event.target.parentElement.dataset.type) {
                index = parseInt(event.target.parentElement.dataset.index);
            }
            else {
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
        async onDropSpellItem(droppedItem) {
            // Retrieve the array
            const spells = [...this.item.system.spells || []];
            // Define the new data
            const newItem = {
                action: "none",
                castAs: "",
                name: droppedItem?.name ?? "",
                uuid: droppedItem?.uuid ?? "",
            };
            // Add the new item to the array
            spells.push(newItem);
            await this.item.update({ "system.spells": spells });
        }
    }
    SpellMixinClass.DEFAULT_OPTIONS = {
        actions: {
            deleteSpell: SpellMixinClass.clickDeleteSpell
        }
    };
    return SpellMixinClass;
};
export { SpellMixin };
