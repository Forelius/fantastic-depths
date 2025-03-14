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
      this._prepareWrestling();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   /**
    * Intercept updateActor method call to log changes.
    * @override
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async onUpdateActor(updateData, options, userId) {
      super.onUpdateActor(updateData, options, userId);
      // If classAbilityAs updated...
      if (this.system?.details?.classAbilityAs?.length > 0) {
         const result = await ClassItem.getClassAbilitiesByCode(this.system?.details?.classAbilityAs, this);
         if (result.classAbilityData) {
            await this._setupSpecialAbilities(result.classKey, result.classAbilityData);
         }
      }
   }

   _prepareWrestling() {
      // Wrestling skill
      const data = this.system;
      const hitDice = data.hp.hd?.match(/^\d+/)[0];
      let wrestling = 0;
      if (hitDice) {
         wrestling = Math.ceil(hitDice * 2);
      }
      // Determine if the monster is wearing any non-natural armor.
      const hasArmor = this.items.some(item => item.type === 'armor' && item.system.equipped === true && item.system.natural === false);
      if (hasArmor) {
         wrestling += data.ac.value;
      } else {
         wrestling += 9;
      }
      this.system.wrestling = wrestling;
   }

   async _prepareSavingThrows() {
      if (this.id) {
         const saveAs = this.system.details.saveAs ?? null;
         if (saveAs) {
            const savesData = await ClassItem.getClassSavesByCode(saveAs, this);
            if (savesData) {
               await this._setupSavingThrows(savesData);
            } else {
               console.warn(`Invalid save-as value ${saveAs} specified for ${this.name}.`);
            }
         }
      }
   } 
}