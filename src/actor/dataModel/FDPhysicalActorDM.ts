import { FDActorBaseDM } from "../dataModel/FDActorBaseDM.js";
import { FDPhysicalActorData, migratePhysicalMovementSource } from '../fields/FDPhysicalActorField.js';

export class FDPhysicalActorDM extends FDActorBaseDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const physicalSchema = FDPhysicalActorData.defineSchema();
      foundry.utils.mergeObject(baseSchema, physicalSchema);
      return baseSchema;
   }

   /** @inheritDoc */
   static migrateData(source) {
      if (source && typeof source === "object") {
         migratePhysicalMovementSource(source);
      }
      return super.migrateData(source);
   }
}
