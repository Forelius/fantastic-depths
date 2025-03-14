export class fadeFinder {
   /**
    * Get an item either from the world or wherever it may be found. This won't guarantee uniqueness for all item types.
    * @private
    * @param {any} name The name of the item to get.
    * @param {any} type The item type.
    */
   static _getItem(name, type) {
      let result;
      const source = game.items;
      result = source.find(item => item.type === type && item.name.toLowerCase() === name.toLowerCase());
      return result;
   }

   /**
    * Internal helper method that can only guarantee uniqueness for some types.
    * @private
    * @param {any} type
    * @param {any} options
    * @returns
    */
   static _getItems(type, options) {
      let result = [];
      const source = game.items;
      if (type === 'specialAbility') {
         result = source.filter(item => item.type === type && item.system.category === options?.category);
      } else {
         result = source.filter(item => item.type === type);
      }
      return result;
   }

   static getSpecialAbility(name, options) {
      let result;
      const type = 'specialAbility';
      const source = game.items;
      if (options?.category === 'class') {
         result = source.find(item => item.type === type && item.system.category === options.category
            && (name === null || item.name.toLowerCase() === name.toLowerCase())
            && item.system.classKey === options.classKey);
      } else if (options?.category === 'save') {
         result = source.find(item => item.type === type && item.system.category === options.category
            && item.system.customSaveCode === options.customSaveCode);
      } else {
         result = source.find(item => item.type === type && item.system.category === options?.category
            && item.name.toLowerCase() === name.toLowerCase());
      }
      return result
   }

   static getSavingThrow(customSaveCode) {
      return fadeFinder.getSpecialAbility(null, { category: 'save', customSaveCode });
   }

   static getSavingThrows() {
      return fadeFinder._getItems('specialAbility', { category: 'save' });
   }

   static getClassAbility(name, classKey) {
      return fadeFinder.getSpecialAbility(name, { category: 'class', classKey });
   }

   static getClass(name, key) {
      const source = game.items;
      let result;
      if (name) {
         result = source.find(item => item.type === 'class' && item.name.toLowerCase() === name.toLowerCase());
      } else {
         result = source.find(item => item.type === 'class' && item.system.key === key);
      }
      return result;
   }

   static getSpecies(name) {
      return fadeFinder._getItem(name, 'species');
   }

   static getWeaponMastery(name) {
      fadeFinder._getItem(name, 'weaponMastery');
   }
}