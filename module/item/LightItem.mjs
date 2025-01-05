import { fadeItem } from './fadeItem.mjs';

export class LightItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();          
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}