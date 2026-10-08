import { SpecialAbilityData } from '../fields/SpecialAbilityField.js';

/**
 * Data model for a special ability item.
 */
export class SpecialAbilityDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return SpecialAbilityData.defineSchema();
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * @inheritDoc
    */
   static migrateData(source) {
      if ((source.customCode == null || source.customCode === "") && source.customSaveCode != null) {
         source.customCode = source.customSaveCode;
      }
      return super.migrateData(source);
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

