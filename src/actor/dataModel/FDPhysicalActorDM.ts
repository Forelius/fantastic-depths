import { FDActorBaseDM } from "../dataModel/FDActorBaseDM.js";
import { FDPhysicalActorData } from '../fields/FDPhysicalActorField.js';
import { CodeMigrate } from "../../sys/migration.js";

export class FDPhysicalActorDM extends FDActorBaseDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const physicalSchema = FDPhysicalActorData.defineSchema();
      foundry.utils.mergeObject(baseSchema, physicalSchema);
      return baseSchema;
   }

   /** @inheritDoc */
   static migrateData(source) {
      CodeMigrate.migratePhysicalActorSource(source);
      return super.migrateData(source);
   }
}
