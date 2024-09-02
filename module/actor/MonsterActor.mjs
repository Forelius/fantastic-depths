// actor-character.mjs
import { fadeActor } from './fadeActor.mjs';

export class MonsterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;

      systemData.details = systemData.details || {};
      systemData.details.xpAward = !isNaN(systemData.details.xpAward) ? systemData.details.xpAward : 5;
      systemData.details.abilityCount = !isNaN(systemData.details.abilityCount) ? systemData.details.abilityCount : 0;

      systemData.na = systemData.na || {};
      systemData.na.wandering = systemData.na.wandering || "1d4";
      systemData.na.lair = systemData.na.lair || "1d6";

      systemData.treasure = systemData.treasure || {};
      systemData.treasure.wandering = systemData.treasure.wandering || "";
      systemData.treasure.lair = systemData.treasure.lair || "";
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      const systemData = this.system;
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }
}