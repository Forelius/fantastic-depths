import { fadeItem } from './fadeItem.mjs';
import { ClassDataModel } from './dataModel/ClassDataModel.mjs';

export class ClassItem extends fadeItem {
   /** @override */
   static get dataModel() {
      return ClassDataModel;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }
}