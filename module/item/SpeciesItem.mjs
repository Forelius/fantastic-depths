import { fadeItem } from './fadeItem.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class SpeciesItem extends fadeItem {
   constructor(data, context) {
      super(data, context);
      this.languageManager = new TagManager(this, 'languages'); // Initialize TagManager
   }

   async createSpecialAbility() {
      // Retrieve the array
      const item = this.system.specialAbilities || [];
      // Define the new data
      const newItem = {
         name: "",
         target: 0
      };
      // Add the new item to the array
      item.push(newItem);
      await this.update({ "system.specialAbilities": item });
   }

   async createClass() {
      // Retrieve the array
      const item = this.system.classes || [];
      // Define the new data
      const newItem = {
         name: "",
         maxLevel: 1
      };
      // Add the new item to the array
      item.push(newItem);
      await this.update({ "system.classes": item });
   }

   /**
    * Retrieves the specified class item, if it exists.
    * @param {any} name The class item's full and case-sensitive name.
    * @returns The specified class item or undefined if not found.
    */
   static getByName(name) {
      if (name === null || name === undefined || name === '') return;
      const result = game.items.find(item => item.name.toLowerCase() == name.toLowerCase() && item.type === 'species');
      if (!result) {
         console.warn(`Species item not found ${name}.`);
      }
      return result;
   }

   static getSpecialAbilities(name) {
      const theItem = SpeciesItem.getByName(name);
      let result;
      if (theItem) {
         result = theItem.system.specialAbilities.reduce((acc, a) => ((acc[a.name] = !acc[a.name] ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }
}