import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class ConditionItem extends fadeItem {
   constructor(data, context) {
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}