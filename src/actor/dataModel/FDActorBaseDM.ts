import { FDActorBaseData } from '../fields/FDActorBaseField.js';

export class FDActorBaseDM extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return FDActorBaseData.defineSchema();
   }
}
