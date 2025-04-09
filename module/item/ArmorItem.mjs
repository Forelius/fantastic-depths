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
         data.totalAAC = data.totalAC;
      } else {
         data.totalAC = data.ac - data.mod;
         data.totalAAC = data.isShield ? data.totalAC : CONFIG.FADE.ToHit.BaseTHAC0 - data.totalAC;
      }
   }
}