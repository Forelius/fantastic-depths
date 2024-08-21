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
      const systemData = this.system;
      systemData.mod = {};
      systemData.mod.dmg = 0;
      systemData.mod.toHit = 0;
      systemData.mod.dmgRanged = 0;
      systemData.mod.toHitRanged = 0;

      // Apply any effects that modify system.mod
      const modEffects = this.effects.filter(effect =>
         effect.changes.some(change => change.key.startsWith('system.mod.'))
      );
      //modEffects.forEach(effect => {
      //   effect.changes.forEach(change => {
      //      const path = change.key.split('.').slice(1); // Remove 'system'
      //      let prop = systemData;
      //      path.slice(0, -1).forEach(key => prop = prop[key] ??= {});
      //      prop[path.at(-1)] += parseInt(change.value, 10);
      //   });
      //});

      //modEffects.forEach(effect => {
      //   effect.changes.forEach(change => {
      //      if (change.key === 'system.mod.dmg') {
      //         systemData.mod.dmg += parseInt(change.value, 10);
      //      } else if (change.key === 'system.mod.toHit'){
      //         systemData.mod.toHit += parseInt(change.value, 10);
      //      }
      //   });
      //});
   //   systemData.totalAc = systemData.ac - systemData.mod;
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
}