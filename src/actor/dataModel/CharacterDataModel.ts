import { FDCombatActorDM } from "../dataModel/FDCombatActorDM.js";
import { CharacterData } from '../fields/CharacterField.js';

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
}

