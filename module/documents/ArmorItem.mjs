// actor-character.mjs
import { fadeItem } from './item.mjs';

export class ArmorItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      console.log(`ArmorItem constructor: type=${data.type}`, this.name, context, this?.actor);
   }

   /** @override */
   prepareBaseData() {     
      super.prepareBaseData();
      const systemData = this.system;
      systemData.ac = systemData.ac || 9;
      systemData.mod = systemData.mod || 0;
      systemData.isShield = systemData.isShield || false;
      systemData.equipped = systemData.equipped || false;
      //console.log("ArmorItem.prepareBaseData", systemData);
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
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
      systemData.totalAc = systemData.ac - systemData.mod;
      //console.log("ArmorItem.prepareDerivedData:", systemData);
   }

   /** @override */
   prepareData() {
      super.prepareData();
      //console.log("ArmorItem.prepareData:", this.name, this?.parent, this?.actor);
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }
}