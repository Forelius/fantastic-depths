import { fadeItem } from './fadeItem.mjs';

export class ArmorItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {     
      super.prepareBaseData();
      //const systemData = this.system;
      //systemData.ac = systemData.ac !== undefined ? systemData.ac : 9;
      //systemData.mod = systemData.mod !== undefined ? systemData.mod : 0;
      //systemData.isShield = systemData.isShield || false;
      //systemData.natural = systemData.natural || false;
      //systemData.equipped = systemData.natural || systemData.equipped || false;
      //systemData.armorWeight = systemData.armorWeight || "light";
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