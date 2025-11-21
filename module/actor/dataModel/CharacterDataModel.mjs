import { FDCombatActorDM } from "../dataModel/FDCombatActorDM.mjs";
import { CharacterData } from '../fields/CharacterField.mjs';

export class CharacterDataModel extends FDCombatActorDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const characterSchema = CharacterData.defineSchema();
      foundry.utils.mergeObject(baseSchema, characterSchema);
      return baseSchema;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.encumbrance.max = this.encumbrance.max || game.fade.registry.getSystem("encumbranceSystem").CONFIG.maxLoad;
   }

   getParsedHD() {
      const classSystem = game.fade.registry.getSystem("classSystem");
      return classSystem.getParsedHD(classSystem.getHighestHD(this.parent));
   }
}
