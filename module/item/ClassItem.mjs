import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
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
      // Create the saving throw member variables dynamically from the world's save items.
      const finderSaves = await fadeFinder.getSavingThrows();
      const saveCodes = finderSaves.map(item => item.system.customSaveCode);
      for (let saveCode of saveCodes) {
         newSaveData[saveCode] = 15;
      }
      newSaveData.level = maxLevel + 1; // Increment the level by 1

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

   async createClassAbility() {
      // Retrieve the primeReqs array
      const classAbilities = this.system.classAbilities || [];

      // Define the new primeReq data
      const newClassAbility = {
         level: 1,
         name: "",
         target: 0
      };

      // Add the new primeReq to the array
      classAbilities.push(newClassAbility);
      await this.update({ "system.classAbilities": classAbilities });
   }

   getXPBonus(abilities) {
      const groups = this.system.primeReqs.reduce((acc, curr) => {
         if (!acc[curr.percentage]) acc[curr.percentage] = []; //If this type wasn't previously stored
         acc[curr.percentage].push(curr);
         return acc;
      }, {});
      let highest = 0;

      for (const group of Object.entries(groups)) {
         const tier = groups[group[0]];
         let isQualified = false;
         for (const requirement of tier) {
            isQualified = (requirement.concatLogic === 'none' || requirement.concatLogic === 'or')
               ? abilities[requirement.ability].value >= requirement.minScore
               : isQualified && abilities[requirement.ability].value >= requirement.minScore;
         }
         const currentPerc = parseInt(group);
         highest = isQualified && currentPerc > highest ? currentPerc : highest;
      }
      return highest;
   }

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
            result = await ClassItem.getClassAbilities(classItem.name, parsed.classLevel)
         }
      } else {
         console.warn(`${owner?.name}: Invalid class key specified ${key}.`);
      }
      return { classAbilityData: result, classKey: parsed?.classKey, classLevel: parsed?.classLevel };
   }

   static async getClassAbilities(className, classLevel) {
      const classItem = await fadeFinder.getClass(className);
      let result;
      if (classItem) {
         result = classItem.system.classAbilities.filter(a => a.level <= classLevel)
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
}