import { fadeItem } from './fadeItem.mjs';

export class ArmorItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareEffects();
   }

   _prepareEffects() {
      const systemData = this.system;
      systemData.mod = 0;
      // Apply any effects that modify system.mod
      const modEffects = this.effects.filter(effect => effect.changes.some(change => change.key === 'system.mod' ) && effect.transfer === false);
      modEffects.forEach(effect => {
         effect.changes.forEach(change => {
            if (change.key === 'system.mod') {
               const changeValue = parseInt(change.value, 10);
               systemData.mod += changeValue;
            }
         });
      });
      systemData.totalAC = systemData.ac - systemData.mod;
      systemData.totalAAC = systemData.isShield ? systemData.totalAC : 19 - systemData.totalAc;
   }
}