export class AbilityScoreBase{
   prepareDerivedAbilities(dataModel) {
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      const hasAbilityScoreMods = abilityScoreSetting === "withmod";

      // If this is a character or if monsters have ability score mods...
      if (dataModel.parent.type === "character" || hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
         const adjustments = game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${abilityScoreMods}`);
         for (let [key] of Object.entries(dataModel.abilities)) {
            const total = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.total`)) || 0;
            const sorted = (adjustments ?? []).sort((a, b) => b.min - a.min);
            const adjustment = sorted.find(item => total >= item.min) ?? sorted[0];
            const modValue = adjustment ? Number(adjustment.value) || 0 : 0;
            foundry.utils.setProperty(dataModel.abilities, `${key}.mod`, modValue);
         }

         // Only character
         if (dataModel.parent.type === "character") {
            // Retainers stuff only on characters
            const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
            const adjustments = game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${abilityScoreMods}`);
            const adjustment = adjustments.sort((a, b) => b.min - a.min).find(item => dataModel.abilities.cha.total >= item.min);
            dataModel.retainer.max = adjustment.maxRetainers;
            dataModel.retainer.morale = (adjustment.retainerMorale ?? 10);
         }
      }
   }
}