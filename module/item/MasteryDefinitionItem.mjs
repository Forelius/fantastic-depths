import { ActorMasteryItem } from "./ActorMasteryItem.mjs";
import { fadeItem } from "./fadeItem.mjs";

/**
 * MasteryDefinitionItem class that extends the base fadeItem class.
 */
export class MasteryDefinitionItem extends fadeItem {
   /**
    * Prepare derived data for WeaponMasteryItem.
    */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   async createActorWeaponMastery(owner) {
      const result = await fadeItem.create({
         name: this.name,
         type: "mastery",
      }, { parent: owner });
      return result;
   }
}
