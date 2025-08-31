import { SpecialAbilityData} from '/systems/fantastic-depths/module/item/fields/specialAbilityField.mjs';
/**
 * Data model for a special ability item.
 */
export class SpecialAbilityDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return SpecialAbilityData.defineSchema();
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
   }
}