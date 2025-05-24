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

   async createClassAbility(name="", classKey = null) {
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

   async createClassItem(name="", type=null) {
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

   async createActorClass(owner) {
      const result = await FDItem.create({
         name: this.name,
         type: "actorClass",
      }, { parent: owner });
      return result;
   }
}