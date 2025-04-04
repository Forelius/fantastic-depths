import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { fadeItem } from './fadeItem.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class SpeciesItem extends fadeItem {
   constructor(data, context) {
      super(data, context);
      this.languageManager = new TagManager(this, 'languages'); // Initialize TagManager
   }

   async createSpecialAbility(name = "", classKey = null) {
      // Retrieve the array
      const item = this.system.specialAbilities || [];
      // Define the new data
      const newItem = {
         level: 1,
         name,
         target: 0,
         classKey: classKey || this.system.key
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

   static async getSpecialAbilities(name) {
      const theItem = await fadeFinder.getSpecies(name);
      let result;
      if (theItem) {
         result = theItem.system.specialAbilities.reduce((acc, a) => ((acc[a.name] = !acc[a.name] ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }
}