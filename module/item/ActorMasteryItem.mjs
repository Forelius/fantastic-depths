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
      const { masteryItem, masteryLevel } = this.getMastery(this.name, this.system.level);
      if (!masteryLevel) return; // Exit if no mastery data is found for the given name

      // Update the mastery fields with data from the specified level in FADE.WeaponMastery
      this.system.primaryType = masteryItem.system.primaryType;
      this.system.range = {
         short: masteryLevel.range.short,
         medium: masteryLevel.range.medium,
         long: masteryLevel.range.long
      };
      this.system.pDmgFormula = masteryLevel.pDmgFormula;
      this.system.sDmgFormula = masteryLevel.sDmgFormula;
      this.system.acBonusType = masteryLevel.acBonusType;
      this.system.acBonus = masteryLevel.acBonus;
      this.system.acBonusAT = masteryLevel.acBonusAT;
      this.system.special = masteryLevel.special;
      this.system.pToHit = masteryLevel.pToHit;
      this.system.sToHit = masteryLevel.sToHit;
   }

   getMastery(masteryName, level) {
      let result = null;
      // Try to find class item for this class.
      let masteryItem = game.items.find(item => item.name.toLowerCase() == masteryName.toLowerCase() && item.type === 'weaponMastery');
      // If class item is found...
      if (masteryItem != null) {
         result = masteryItem.system.levels.find(md => md.name === level)
      } else {
         console.warn(`Mastery data not found for ${masteryName}. Owner: ${this.parent?.name}.`);
      }
     
      return { masteryItem, masteryLevel: result };
   }
}