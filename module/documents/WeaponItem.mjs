import { fadeItem } from './item.mjs';

export class WeaponItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      console.log("WeaponItem constructor");
   }

   /** @override */
   prepareBaseData() {     
      super.prepareBaseData();
      const systemData = this.system;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareEffects();
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
      systemData.mod = {
         dmg: 0,
         toHit: 0,
         dmgRanged: 0,
         toHitRanged: 0
      };

      // Filter effects that target any part of system.mod
      const modEffects = this.effects.filter(effect =>
         effect.changes.some(change => change.key.startsWith('system.mod.'))
      );

      // Apply the modifications
      modEffects.forEach(effect => {
         effect.changes.forEach(change => {
            const key = change.key.split('.').pop(); // Extract the last part of the key (e.g., 'dmg')
            const changeValue = parseInt(change.value, 10); // Convert the value to an integer

            // Apply the change if the key exists in systemData.mod
            if (systemData.mod.hasOwnProperty(key)) {
               systemData.mod[key] += changeValue;
            } else {
               console.warn(`Key ${key} not found in systemData.mod`);
            }
         });
      });
   }
}