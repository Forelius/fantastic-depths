import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { SavingThrowsData } from './dataModel/ClassDefinitionDataModel.mjs';
import { FDItem } from './FDItem.mjs';

export class ClassDefinitionItem extends FDItem {
   static ValidItemTypes = ['item', 'weapon', 'armor'];

   /** @override
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
         ability: "",    // Default ability, empty string
         xpBonus5: 0,    // Default XP bonus of 0%
         xpBonus10: 0    // Default XP bonus of 0%
      };

      // Add the new primeReq to the array
      primeReqs.push(newPrimeReqData);
      await this.update({ "system.primeReqs": primeReqs });
   }

   async createClassAbility(name = "", classKey = null) {
      // Retrieve the array
      const specialAbilities = this.system.specialAbilities || [];

      // Define the new data
      const newItem = {
         level: 1,
         name,
         target: 0,
         changes: "",
         classKey: classKey
      };

      // Add the new item to the array
      specialAbilities.push(newItem);
      await this.update({ "system.specialAbilities": specialAbilities });
   }

   /**
    * Class items are things like gear items. It is not referring to actor classes.
    * @param {any} name
    * @param {any} type
    */
   async createClassItem(name = "", type = null) {
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

   /**
    * @override
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
               spells.push(Array.from({ length: this.system.maxSpellLevel + 1 - this.system.firstSpellLevel },(_, index) => 0));
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