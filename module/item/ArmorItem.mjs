import { fadeItem } from './fadeItem.mjs';

export class ArmorItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      //console.log(`ArmorItem constructor: type=${data.type}`, this.name, context, this?.actor);
   }

   /** @override */
   prepareBaseData() {     
      super.prepareBaseData();
      const systemData = this.system;
      systemData.ac = systemData.ac !== undefined ? systemData.ac : 9;
      systemData.mod = systemData.mod !== undefined ? systemData.mod : 0;
      systemData.isShield = systemData.isShield || false;
      systemData.natural = systemData.natural || false;
      systemData.equipped = systemData.natural || systemData.equipped || false;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareEffects();
      const systemData = this.system;
      //console.log("ArmorItem.prepareDerivedData:", systemData);
      systemData.totalAc = systemData.ac - systemData.mod;
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }

   _prepareEffects() {
      const systemData = this.system;
      systemData.mod = 0;
      // Apply any effects that modify system.mod
      const modEffects = this.effects.filter(effect => effect.changes.some(change => change.key === 'system.mod'));
      modEffects.forEach(effect => {
         effect.changes.forEach(change => {
            if (change.key === 'system.mod') {
               const changeValue = parseInt(change.value, 10);
               systemData.mod += changeValue;
            }
         });
      });
   }
}