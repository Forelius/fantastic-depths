import { fadeItem } from './fadeItem.mjs';

export class ActorMasteryItem extends fadeItem {
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

      const levelData = this.#getMastery(this.name, this.system.level);
      if (!levelData) return; // Exit if no mastery data is found for the given name

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

   #getMastery(masteryName, level) {
      let result = null;
      // Try to find class item for this class.
      let masteryItem = game.items.find(item => item.name.toLowerCase() == masteryName.toLowerCase() && item.type === 'weaponMastery');
      // If class item is found...
      if (masteryItem != null) {
         let masteryData = masteryItem.system;
         result = masteryData.levels.find(md => md.name === level)
      } else {
         let masteryData = CONFIG.FADE.WeaponMastery[masteryName];
         result = masteryData[level];
      }

      return result;
   }
}