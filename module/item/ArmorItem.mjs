import { GearItem } from './GearItem.mjs';

export class ArmorItem extends GearItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.prepareEffects();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   prepareEffects() {
      this.system.totalAC = 0;
      this._processNonTransferActiveEffects();
      const data = this.system;
      // If this is a shield item...
      if (data.isShield) {
         // Add the modifier to the ac value of the shield. 
         data.totalAC = data.ac + data.mod;
         data.totalRangedAC = data.ac + data.modRanged;
         data.totalAAC = data.totalAC;
         data.totalRangedAAC = data.totalRangedAC;
      } else {
         data.totalAC = data.ac - data.mod;
         // The ranged mod is cumulative with non-ranged for backwards compatibility.
         data.totalRangedAC = data.totalAC - data.modRanged;
         data.totalAAC = CONFIG.FADE.ToHit.BaseTHAC0 - data.totalAC;
         data.totalRangedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - data.totalRangedAC;
      }
   }
}