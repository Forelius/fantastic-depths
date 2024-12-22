import { SavingThrowsData } from './dataModel/ClassItemDataModel.mjs';
import { fadeItem } from './fadeItem.mjs';

export class ClassItem extends fadeItem {
   async createClassSave() {
      // Retrieve the saves array from the item's data
      const saves = this.system.saves || [];

      // Find the current highest level in the saves array
      const maxLevel = saves.length > 0 ? Math.max(...saves.map(s => s.level)) : 0;

      // Define the new save data
      const newSaveData = new SavingThrowsData();
      newSaveData.level = maxLevel + 1; // Increment the level by 1
      newSaveData.death = 14; // Default save values (customize as needed)
      newSaveData.wand = 12;
      newSaveData.paralysis = 13;
      newSaveData.breath = 15;
      newSaveData.spell = 16;

      // Update the item's saves data
      saves.push(newSaveData);
      await this.update({ "system.saves": saves });
   }

   async createPrimeReq() {
      // Retrieve the primeReqs array
      const primeReqs = this.system.primeReqs || [];

      // Define the new primeReq data
      const newPrimeReqData = {
         ability: "",    // Default ability, empty string
         xpBonus5: 0,    // Default XP bonus of 0%
         xpBonus10: 0    // Default XP bonus of 0%
      };

      // Add the new primeReq to the array
      primeReqs.push(newPrimeReqData);
      await this.update({ "system.primeReqs": primeReqs });
   }

   /**
    * Retrieves the specified class item, if it exists.
    * @param {any} className The class item's full and case-sensitive name.
    * @returns The specified class item or undefined if not found.
    */
   static getClassItem(className) {
      const result = game.items.find(item => item.name.toLowerCase() == className.toLowerCase() && item.type === 'class');
      if (!result) {
         console.warn(`Class item not found ${className}.`);
      }
      return result;
   }

   /**
    * Gets the class saving throw data for the specified level.
    * @param {any} className The class item's full and case-sensitive name.
    * @param {any} classLevel The class level
    * @returns The saving throw data for the specified class and level, otherwise undefined
    */
   static getClassSaves(className, classLevel) {
      const classItem = ClassItem.getClassItem(className);
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
   static getClassSavesByCode(key) {
      // Extract class identifier and level from the input
      let match = key.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
      let result;
      if (parsed) {
         const classItem = game.items.find(item => item.system.key === parsed.classId && item.type === 'class');
         if (!classItem) {
            console.warn(`Class item not found ${key}.`);
         } else {
            result = classItem.system.saves.find(save => parsed.classLevel <= save.level);
         }
      } else {
         console.warn(`Invalid class key specified ${key}.`);
      }
      return result;
   }
}