import { FDItem } from "./FDItem.mjs";

/**
 * MasteryDefinitionItem class that extends the base FDItem class.
 */
export class MasteryDefinitionItem extends FDItem {
   /**
    * Prepare derived data for WeaponMasteryItem.
    */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   async createActorWeaponMastery(owner) {
      const result = await FDItem.create({
         name: this.name,
         type: "mastery",
      }, { parent: owner });
      return result;
   }
}
