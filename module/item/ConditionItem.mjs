import { fadeItem } from './fadeItem.mjs';

export class ConditionItem extends fadeItem {
   constructor(data, context) {
      super(data, context);
   }

   get duration() {
      return 0;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         this.system.key = this.system.key === '' ? this.name.toLowerCase() : this.system.key;

         if (this.effects.size === 0) {
            this.createEmbeddedDocuments('ActiveEffect', [
               {
                  name: this.name,
                  img: 'icons/svg/aura.svg',
                  //origin: this.owner.uuid,               
                  disabled: false
               }
            ]);
         }
      }
   }
}