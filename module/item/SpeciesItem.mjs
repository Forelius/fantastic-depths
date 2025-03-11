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
}