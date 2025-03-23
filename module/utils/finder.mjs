export class fadeFinder {

   static _getItemPack() {
      return game.packs.get('fade-compendiums.item-compendium');
   }

   static _getRollTablePack() {
      return game.packs.get('fade-compendiums.roll-table-compendium');
   }

   /**
    * Get the item source. First try world, then try compendiums.
    * @private
    * @param {any} type
    * @returns
    */
   static async _getPackSource(type) {
      let result = null;
      if (type === 'rolltable') {
         result = await fadeFinder._getRollTablePack()?.getDocuments();
      } else {
         result = await fadeFinder._getItemPack()?.getDocuments({ type });
      }
      return result;
   }

   /**
    * Get the item source from world items.
    * @private
    * @param {any} type
    * @returns
    */
   static _getWorldSource(type) {
      let result = null;
      if (type === 'rolltable') {
         result = game.tables;
      } else {
         result = game.items.filter(item => item.type === type);
      }
      return result;
   }

   /**
    * Get an item either from the world or wherever it may be found. This won't guarantee uniqueness for all item types.
    * @private
    * @param {*} source The source of the item. 
    * @param {any} name The name of the item to get.
    */
   static _getItem(source, name) {
      return source?.filter(item => item.name.toLowerCase() === name.toLowerCase())?.[0];
   }

   /**
    * Retrieves a special ability.
    * @private
    * @param {any} name
    * @param {any} options
    * @returns
    */
   static _getSpecialAbility(source, name, options) {
      let result;
      const type = 'specialAbility';
      if (source) {
         if (options?.category === 'class') {
            result = source.filter(item => item.type === type && item.system.category === options.category
               && (name === null || item.name.toLowerCase() === name.toLowerCase())
               && item.system.classKey === options.classKey)?.[0];
         } else if (options?.category === 'save') {
            result = source.filter(item => item.type === type && item.system.category === options.category
               && (name === null || item.name.toLowerCase() === name.toLowerCase())
               && item.system.customSaveCode === options.customSaveCode)?.[0];
         } else {
            result = source.filter(item => item.type === type && item.system.category === options?.category
               && item.name.toLowerCase() === name.toLowerCase())?.[0];
         }
      }
      return result
   }

   static async getSavingThrows() {
      const type = 'specialAbility';
      let source = fadeFinder._getWorldSource(type);
      let result = source?.filter(item => item.system.category === 'save');
      if (result.length === 0) {
         source = await fadeFinder._getPackSource(type);
         result = source?.filter(item => item.system.category === 'save');
      }
      return result;
   }

   static async getRollTables() {
      const type = 'rolltable';
      let source = fadeFinder._getWorldSource(type);
      let result = source;
      if (result.length === 0) {
         source = await fadeFinder._getPackSource(type);
         result = source;
      }
      return result;
   }

   static async getRollTable(name) {
      const type = 'rolltable'
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getItem(source, name);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getItem(source, name);
      }
      return result;
   }


   static async getSavingThrow(customSaveCode) {
      const type = 'specialAbility';
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getSpecialAbility(source, null, { category: 'save', customSaveCode });
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getSpecialAbility(source, null, { category: 'save', customSaveCode });
      }
      return result;
   }

   static async getClassAbility(name, classKey) {
      const type = 'specialAbility';
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getSpecialAbility(source, name, { category: 'class', classKey });
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getSpecialAbility(source, name, { category: 'class', classKey });
      }
      return result;
   }

   static async getClass(name, key) {
      const type = 'class';
      function doFind(source, name, key) {
         if (name) return source?.filter(item => item.name.toLowerCase() === name.toLowerCase())?.[0];
         else return source?.filter(item => item.system.key === key)?.[0];
      }
      let source = fadeFinder._getWorldSource(type);
      let result = doFind(source, name, key);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = doFind(source, name, key);
      }
      return result;
   }

   static async getSpecies(name) {
      const type = 'species'
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getItem(source, name);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getItem(source, name);
      }
      return result;
   }

   static async getWeaponMastery(name) {
      const type = 'weaponMastery'
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getItem(source, name);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getItem(source, name);
      }
      return result;
   }
}