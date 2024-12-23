import { fadeItem } from './fadeItem.mjs';

export class ArmorItem extends fadeItem {
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
      this._processNonTransferActiveEffects();
      const data = this.system;
      data.totalAC = data.ac - data.mod;
      data.totalAAC = data.isShield ? data.totalAC : 19 - data.totalAC;
   }
}