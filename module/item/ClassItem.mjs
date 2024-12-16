import { SavingThrowsData } from './dataModel/ClassItemDataModel.mjs';
import { fadeItem } from './fadeItem.mjs';

export class ClassItem extends fadeItem {
   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }

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
}