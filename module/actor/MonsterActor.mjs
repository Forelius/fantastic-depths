// actor-character.mjs
import { ClassItem } from "../item/ClassItem.mjs";
import { fadeActor } from './fadeActor.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class MonsterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareSavingThrows();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   _prepareSavingThrows() {
      const saveAs = this.system.details.saveAs ?? null;
      if (saveAs) {
         const savesData = ClassItem.getClassSavesByCode(saveAs, this);
         if (savesData) {
            this.system._prepareSavingThrows(savesData);
         }
      }
   }
}