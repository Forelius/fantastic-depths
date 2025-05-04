export class fadeFinder {

   static _actorPackName() {
      return game.settings.get(game.system.id, "actorPack");
   }
   static _getActorPack() {
      return game.packs.get(fadeFinder._actorPackName() ?? 'fade-compendiums.actor-compendium');
   }

   static _itemPackName() {
      return game.settings.get(game.system.id, "itemPack");
   }
   static _getItemPack() {
      return game.packs.get(fadeFinder._itemPackName() ?? 'fade-compendiums.item-compendium');
   }

   static _rollTablePackName() {
      return game.settings.get(game.system.id, "rollTablePack");
   }
   static _getRollTablePack() {
      return game.packs.get(fadeFinder._rollTablePackName() ?? 'fade-compendiums.roll-table-compendium');
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
      } else if (type === 'actor') {
         result = await fadeFinder._getActorPack()?.getDocuments();
      }
      else if (type === 'anyItem') {
         result = await fadeFinder._getItemPack()?.getDocuments();
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
      } else if (type === 'actor') {
         result = game.actors;
      } else if (type === 'anyItem') {
         result = game.items;
      } else {
         result = game.items.filter(item => item.type == type);
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
      return source?.filter(item => item.name.toLowerCase() == name.toLowerCase())?.[0];
   }

   static _getItemById(source, id) {
      return source?.filter(item => item.id === id)?.[0];
   }

   /**
    * Retrieves a special ability.
    * @private
    * @param {any} name The special ability's name.
    * @param {any} options Additional options for matching fields (category, customSaveCode).
    * @returns The requested special ability, otherwise undefined.
    */
   static _getSpecialAbility(source, name, options) {
      let result;
      const type = 'specialAbility';
      if (source) {
         if (options?.category === 'class') {
            result = source.filter(item => item.type == type && item.system.category == options.category
               && (!name || item.name.toLowerCase() == name.toLowerCase())
               && ((!options.classKey && !item.system.classKey) || item.system.classKey == options.classKey))?.[0];
         } else if (options?.category === 'save') {
            result = source.filter(item => item.type == type && item.system.category == options.category
               && (!name || item.name.toLowerCase() == name.toLowerCase())
               && item.system.customSaveCode == options.customSaveCode)?.[0];
         } else if (options?.categoryNEQ === 'save') {
            result = source.filter(item => item.type == type && item.system.category !== options.categoryNEQ
               && (!name || item.name.toLowerCase() == name.toLowerCase())
               && ((!options.classKey && !item.system.classKey) || item.system.classKey == options.classKey))?.[0];
         } else {
            result = source.filter(item => item.type == type && item.system.category == options?.category
               && item.name.toLowerCase() == name.toLowerCase())?.[0];
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

   static async getRollTables(compendiumOnly = false) {
      const type = 'rolltable';
      let result;
      if (compendiumOnly !== true) {
         result = fadeFinder._getWorldSource(type);
      }
      result = [...result, ...(await fadeFinder._getPackSource(type))];
      return result;
   }

   static async getConditions(compendiumOnly = false) {
      const type = 'condition';
      let result;
      if (compendiumOnly !== true) {
         result = fadeFinder._getWorldSource(type);
      }
      result = [...result, ...(await fadeFinder._getPackSource(type))];
      return result;
   }

   static async getActors(compendiumOnly = false) {
      const type = 'actor';
      let result;
      if (compendiumOnly !== true) {
         result = fadeFinder._getWorldSource(type);
      }
      result = [...result, ...(await fadeFinder._getPackSource(type))];
      return result;
   }

   /**
    * Retrieve class special abilities from the specified class and for the specified level.
    * @param {any} className The class name.
    * @param {any} classLevel The level to retrieve abilities for.
    * @returns An array or undefined.
    */
   static async getClassAbilities(className, classLevel) {
      const classItem = await fadeFinder.getClass(className);
      let result;
      if (classItem) {
         result = classItem.system.specialAbilities.filter(a => a.level <= classLevel)
            .reduce((acc, a) => ((acc[a.name] = !acc[a.name] || a.level > acc[a.name].level ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }

   /**
    * Retrieves class special abilities. This is not an array of the specialAbilities.
    * @param {any} key The class key.
    * @param {any} owner For debugging purpose, the requesting actor.
    * @returns An object containing classAbilityData, classKey and classLevel properties.
    */
   static async getClassAbilitiesByCode(key, owner) {
      // Extract class identifier and level from the input
      let match = key.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classKey: match[1], classLevel: parseInt(match[2], 10) } : null;
      let result;
      if (parsed) {
         const classItem = await fadeFinder.getClass(null, parsed.classKey);
         if (!classItem) {
            console.warn(`Class item not found ${key}.`);
         } else {
            result = await fadeFinder.getClassAbilities(classItem.name, parsed.classLevel)
         }
      } else {
         console.warn(`${owner?.name}: Invalid class key specified ${key}.`);
      }
      return { classAbilityData: result, classKey: parsed?.classKey, classLevel: parsed?.classLevel };
   }

   /**
    * Retrieves class items from the class. This is not an array of items, just the data from the class.
    * @param {any} className The class name.
    * @param {any} classLevel The level to retrieve abilities for.
    * @returns An array or undefined.
    */
   static async getClassItems(className, classLevel) {
      const classItem = await fadeFinder.getClass(className);
      let result;
      if (classItem) {
         result = classItem.system.classItems.filter(a => a.level <= classLevel)
            .reduce((acc, a) => ((acc[a.name] = !acc[a.name] || a.level > acc[a.name].level ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }

   /**
    * Gets the class saving throw data for the specified level.
    * @param {any} className The class item's full and case-sensitive name.
    * @param {any} classLevel The class level
    * @returns The saving throw data for the specified class and level, otherwise undefined
    */
   static async getClassSaves(className, classLevel) {
      const classItem = await fadeFinder.getClass(className);
      let result;
      if (classItem) {
         result = classItem.system.saves.find(save => classLevel <= save.level);
      }
      return result;
   }

   /**
    * Gets the class saving throw data by code. 
    * @param {any} key Format is a character/word followed by a number, no spaces. F1, C2, BA4
    * @returns The saving throw data for the specified class and level, otherwise undefined.
    */
   static async getClassSavesByCode(key, owner) {
      // Extract class identifier and level from the input
      const match = key.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classKey: match[1], classLevel: parseInt(match[2], 10) } : null;
      let result;
      if (parsed) {
         const classItem = await fadeFinder.getClass(null, parsed.classKey);
         if (!classItem) {
            console.warn(`Class item not found ${key}.`);
         } else {
            result = classItem.system.saves.find(save => parsed.classLevel <= save.level);
         }
      } else {
         console.warn(`${owner?.name}: Invalid class key specified ${key}.`);
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

   static async getRollTableById(id) {
      const type = 'rolltable'
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getItemById(source, id);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getItemById(source, id);
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

   /**
    * Retrieve the specialAbility document from either the world or compendiums.
    * @param {any} name The name of the special ability.
    * @param {any} classKey The classKey of the special ability.
    * @returns
    */
   static async getClassAbility(name, classKey) {
      const type = 'specialAbility';
      let source = fadeFinder._getWorldSource(type);
      let result = fadeFinder._getSpecialAbility(source, name, { categoryNEQ: 'save', classKey });
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = fadeFinder._getSpecialAbility(source, name, { categoryNEQ: 'save', classKey });
      }
      return result;
   }

   /**
    * Retrieve the item document from either the world or compendiums.
    * @param {any} name The name of the item.
    * @param {*} types An array strings representing the item types
    * @returns
    */
   static async getItem(name, types) {
      const type = 'anyItem';
      let source = fadeFinder._getWorldSource(type);
      let result = source.filter(item => types.includes(item.type) && (!name || item.name.toLowerCase() == name.toLowerCase()))?.[0];
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = source.filter(item => types.includes(item.type) && (!name || item.name.toLowerCase() == name.toLowerCase()))?.[0];
      }
      return result;
   }

   static async getClass(name, key) {
      const type = 'class';
      function doFind(source, name, key) {
         if (name) return source?.filter(item => item.name.toLowerCase() == name.toLowerCase())?.[0];
         else return source?.filter(item => item.system.key == key)?.[0];
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

   static async getActorByName(name) {
      const type = 'actor';
      let result;
      let source = fadeFinder._getWorldSource(type);
      result = source.filter(item => item.name === name);
      if (!result) {
         source = await fadeFinder._getPackSource(type);
         result = source.filter(item => item.name === name);
      }
      return result?.[0];
   }
}