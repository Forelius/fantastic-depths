import { FDActorBaseData } from '/systems/fantastic-depths/module/actor/fields/FDActorBaseField.mjs';

export class FDActorBaseDM extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return FDActorBaseData.defineSchema();
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      return super.migrateData(source);
   }
}