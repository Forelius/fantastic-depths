import { fadeFinder } from '../utils/finder.mjs';
import { SavingThrowsData } from './dataModel/ClassDefinitionDataModel.mjs';
import { FDItem } from './FDItem.mjs';

export class ClassDefinitionItem extends FDItem {
   static ValidItemTypes = ['item', 'weapon', 'armor'];

   /** 
    * @protected 
    */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.system.specialAbilities = this.system.specialAbilities.sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));
      this.system.saves = this.system.saves.sort((a, b) => (a.level - b.level));
   }

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
         concatLogic: "",
         percentage: 5,
         minScore: 13,
         ability: "",    // Default ability, empty string
      };

      // Add the new primeReq to the array
      primeReqs.push(newPrimeReqData);
      await this.update({ "system.primeReqs": primeReqs });
   }

   /**
    * Class items are things like gear items. It is not referring to actor classes.
    * @param {any} name
    * @param {any} type
    */
   async createItem(name = "", type = null) {
      // Retrieve the array
      const items = this.system.classItems || [];

      // Define the new data
      const newItem = {
         level: 1,
         name,
         type,
         changes: ""
      };

      // Add the new item to the array
      items.push(newItem);
      await this.update({ "system.classItems": items });
   }

   /**
    * 
    * @param {any} abilities The character's ability scores.
    * @returns {number} The total xp bonus for this class.
    */
   getXPBonus(abilities) {
      let i = 0;
      const primeReqs = [...this.system.primeReqs]; // work with copy

      // primeReqs are already sorted by percentage in ascending order.
      const tiers = primeReqs.reduce((acc, curr) => {
         if (!acc[curr.percentage]) {
            acc[curr.percentage] = {};
            i = 0;
         }
         if (curr.concatLogic?.length > 0 && curr.concatLogic !== "none") {
            if (!acc[curr.percentage]) acc[curr.percentage][i] = [curr];
            else acc[curr.percentage][i].push(curr);
         } else {
            // This type wasn't previously stored
            i++;
            acc[curr.percentage][i] = [curr];
         }
         return acc;
      }, {});

      // Get qualifying primreqs
      // @ts-ignore
      const tierEntries = Object.entries(tiers).sort((a, b) => a[0] - b[0]);
      let qualified = {};
      for (const [tierKey, tierVal] of tierEntries) {
         const currentPerc = parseInt(tierKey);
         for (const [groupKey, groupVal] of Object.entries(tierVal)) {
            let isQualified = false;
            const reqId = `${groupVal.reduce((acc, curr) => acc = `${acc}${curr.concatLogic === "none" ? "" : `-${curr.concatLogic}-`}${curr.ability}`, "")}`;
            for (const requirement of groupVal) {
               if (requirement.concatLogic === "none" || requirement.concatLogic === "or") {
                  isQualified = abilities[requirement.ability].value >= requirement.minScore;
               } else {
                  isQualified = isQualified && abilities[requirement.ability].value >= requirement.minScore;
               }
            }
            if (isQualified) {
               if (qualified[reqId]) {
                  if (qualified[reqId][tierKey]) {
                     qualified[reqId][tierKey] += currentPerc;
                  } else {
                     qualified[reqId] = {};
                     qualified[reqId][tierKey] = currentPerc;
                  }
               }
               else {
                  qualified[reqId] = {};
                  qualified[reqId][tierKey] = currentPerc;
               }
            }
         }
      }

      // Only keep highest of same ability score matches.
      // My brain hurts. 
      return Object.entries(qualified).reduce((acc, curr) =>  acc + Object.entries(curr[1])[0][1], 0);
   }

   /**
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async _onUpdate(updateData, options, userId) {
      super._onUpdate(updateData, options, userId);
      if (updateData.system?.maxLevel !== undefined || updateData.system?.firstLevel !== undefined) {
         // This is an async method
         await this.#updateLevels(updateData);
         await this.#updateSpellLevels(updateData);
      }
      if (updateData.system?.maxSpellLevel !== undefined || updateData.system?.firstSpellLevel !== undefined) {
         await this.#updateSpellLevels(updateData);
      }
   }

   async #updateLevels(updateData) {
      // This will filter out levels with a level of null or negative, because those need to be removed.
      const levels = [...this.system.levels.filter(item => typeof item.level === typeof 0)];

      const newFirstLevel = Math.max(0, this.system.firstLevel);
      const newMaxLevel = Math.max(newFirstLevel, this.system.maxLevel);
      const currentFirstLevel = this.system.levels?.[0]?.level;


      let levelSequence = currentFirstLevel ?? newFirstLevel;
      for (let level of levels) {
         // Pre-order in case levels are all screwed up
         level.level = levelSequence++;
      }

      // If we are starting with an empty array...
      if (currentFirstLevel === undefined) {
         // Insert
         levels.unshift(...Array.from({ length: newMaxLevel - newFirstLevel },
            (_, index) => { return { level: index + newFirstLevel } }));
      } else if (newFirstLevel < currentFirstLevel) {
         // Insert
         levels.unshift(...Array.from({ length: currentFirstLevel - newFirstLevel },
            (_, index) => {
               return { level: index + newFirstLevel };
            }
         ));
      } else if (newFirstLevel > currentFirstLevel) {
         // Delete
         levels.splice(0, newFirstLevel - currentFirstLevel);
      }

      const currentMaxLevel = this.system.levels.reduce((max, current) => {
         return current.level > max ? current.level : max;
      }, this.system.levels?.[0]?.level ?? 0);

      if (newMaxLevel < currentMaxLevel) {
         levels.splice(newMaxLevel - currentMaxLevel, currentMaxLevel - newMaxLevel);
      } else if (newMaxLevel > currentMaxLevel) {
         levels.push(...Array.from({ length: newMaxLevel - currentMaxLevel },
            (_, index) => {
               return { level: currentMaxLevel + index + 1 };
            }));
      }

      await this.update({ "system.levels": levels });
   }

   async #updateSpellLevels(updateData) {
      let spells = [];
      const levelsCount = this.system.levels.length;
      const spellLevelNo = this.system.maxSpellLevel - this.system.firstSpellLevel + 1;

      if (this.system.maxSpellLevel > 0) {
         spells = [...this.system.spells]
         for (let i = 0; i < levelsCount; i++) {
            // Pre-set spellLevels to be same size as levels.
            if (spells[i] === undefined) {
               spells.push(Array.from({ length: this.system.maxSpellLevel + 1 - this.system.firstSpellLevel }, (_, index) => 0));
            } else if (spells[i]?.length > spellLevelNo) {
               spells[i].splice(spellLevelNo - spells[i]?.length, spellLevelNo - spells[i]?.length);
            } else if (spells[i]?.length < spellLevelNo) {
               spells[i].push(...Array.from({ length: spellLevelNo - spells[i]?.length }, (_, index) => 0));
            }
         }

         // Pre-set spellLevels to be same size as levels.
         const spellLevelsCount = this.system.spells.length;
         if (spellLevelsCount > levelsCount) {
            spells.splice(levelsCount - spellLevelsCount, spellLevelsCount - levelsCount);
         }
      }

      await this.update({ "system.spells": spells });
   }
}