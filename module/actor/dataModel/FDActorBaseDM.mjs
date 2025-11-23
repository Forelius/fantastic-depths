import { FDActorBaseData } from '../fields/FDActorBaseField.mjs';

export class FDActorBaseDM extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return FDActorBaseData.defineSchema();
   }
}