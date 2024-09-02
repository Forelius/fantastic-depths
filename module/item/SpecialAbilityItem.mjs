import { fadeItem } from './fadeItem.mjs';

export class SpecialAbilityItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      console.log(`SpecialAbilityItem constructor: type=${data.type}`, this.name, context, this?.actor);
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