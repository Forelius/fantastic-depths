import { FDCombatActorDM } from "/systems/fantastic-depths/module/actor/dataModel/FDCombatActorDM.mjs";
import { CharacterData } from '/systems/fantastic-depths/module/actor/fields/CharacterField.mjs';

export class CharacterDataModel extends FDCombatActorDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const characterSchema = CharacterData.defineSchema();
      foundry.utils.mergeObject(characterSchema, baseSchema);
      return characterSchema;
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

   _prepareDerivedAbilities() {
      super._prepareDerivedAbilities();

      // Retainers stuff only on characters
      const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
      const adjustments = game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${abilityScoreMods}`);
      const adjustment = adjustments.sort((a, b) => b.min - a.min).find(item => this.abilities.cha.total >= item.min);
      this.retainer.max = adjustment.maxRetainers;
      this.retainer.morale = (adjustment.retainerMorale ?? 10);
   }
}
