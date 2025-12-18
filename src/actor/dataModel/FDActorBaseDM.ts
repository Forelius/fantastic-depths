import { FDActorBaseData } from '../fields/FDActorBaseField';

export class FDActorBaseDM extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return FDActorBaseData.defineSchema();
   }
}