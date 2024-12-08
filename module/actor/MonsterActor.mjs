// actor-character.mjs
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
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}