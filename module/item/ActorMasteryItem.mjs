import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
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
   async _updatePropertiesFromMastery() {
      // TODO: This needs to be synchronous or prepareBaseData can't call reliably.
      const { masteryItem, masteryLevel } = await this.getMastery(this.name, this.system.level);
      if (!masteryLevel) return; // Exit if no mastery data is found for the given name

      // Update the mastery fields with data from the specified level in FADE.WeaponMastery
      this.system.weaponType = masteryItem.system.weaponType;
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

   async getMastery(masteryName, level) {
      let result = null;
      const masteryItem = await fadeFinder.getWeaponMastery(masteryName);
      // If item is found...
      if (masteryItem != null) {
         result = masteryItem.system.levels.find(md => md.name === level)
      } else {
         console.warn(`Mastery data not found for ${masteryName}. Owner: ${this.parent?.name}.`);
      }
      return { masteryItem, masteryLevel: result };
   }

   async getInlineDescription() {
      let description = game.i18n.format('FADE.Mastery.summary', {
         weaponType: this.system.weaponType ? game.i18n.localize(`FADE.Mastery.weaponTypes.${this.system.weaponType}.long`) : '--',
         primaryType: game.i18n.localize(`FADE.Mastery.weaponTypes.${this.system.primaryType}.long`) ,
         special: this.system.special ?? '--',
         short: this.system.range.short ?? '--',
         medium: this.system.range.medium ?? '--',
         long: this.system.range.long ?? '--',
         defense: this.system.acBonusType ? `Defense vs. ${this.system.acBonusType}: ${this.system.acBonus ?? '--'}/${this.system.acBonusAT ?? '--'}` : 'No defense bonus'
      });
      if (description?.length <= 0) {
         description = '--';
      }
      return description;
   }
}