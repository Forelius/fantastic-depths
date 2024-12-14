import { fadeItem } from './fadeItem.mjs';

export class MasteryItem extends fadeItem {
   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      // Check if the item has a valid name and update properties based on FADE.WeaponMastery
      this._updatePropertiesFromMastery();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   /** Update item properties based on FADE.WeaponMastery */
   _updatePropertiesFromMastery() {
      const masteryData = CONFIG.FADE.WeaponMastery[this.name];
      if (!masteryData) return; // Exit if no mastery data is found for the given name

      const levelData = masteryData[this.system.level];
      if (!levelData) return; // Exit if level data is not found

      // Update the mastery fields with data from the specified level in FADE.WeaponMastery
      this.system.primaryType = levelData.primaryType;
      this.system.range = {
         short: levelData.range.short,
         medium: levelData.range.medium,
         long: levelData.range.long
      };
      this.system.pDmgFormula = levelData.pDmgFormula;
      this.system.sDmgFormula = levelData.sDmgFormula;
      this.system.acBonusType = levelData.acBonusType;
      this.system.acBonus = levelData.acBonus;
      this.system.acBonusAT = levelData.acBonusAT;
      this.system.special = levelData.special;
      this.system.pToHit = levelData.pToHit;
      this.system.sToHit = levelData.sToHit;
   }
}