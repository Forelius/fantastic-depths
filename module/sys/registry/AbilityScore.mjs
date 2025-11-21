export class AbilityScoreBase {
   constructor() {
      this.abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      this.hasAbilityScoreMods = this.abilityScoreSetting === "withmod";
      this.abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
   }

   prepareBaseData(dataModel) {
      for (let [key] of Object.entries(dataModel.abilities)) {
         const value = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.value`)) || 0;
         const tempMod = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.tempMod`)) || 0;
         foundry.utils.setProperty(dataModel.abilities, `${key}.total`, value + tempMod);
      }
   }

   prepareDerivedData(dataModel) {
      // If this is a character or if monsters have ability score mods...
      if (dataModel.parent.type === "character" || this.hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         for (let [key] of Object.entries(dataModel.abilities)) {
            const adjustments = this.getAdjustments(key);
            const total = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.total`)) || 0;
            const sorted = (adjustments ?? []).sort((a, b) => b.min - a.min);
            const adjustment = sorted.find(item => total >= item.min) ?? sorted[0];
            const modValue = adjustment ? Number(adjustment.value) || 0 : 0;
            foundry.utils.setProperty(dataModel.abilities, `${key}.mod`, modValue);
         }

         // Only character
         if (dataModel.parent.type === "character") {
            // Retainers stuff only on characters
            const adjustments = this.getAdjustments("cha");
            const adjustment = adjustments.sort((a, b) => b.min - a.min).find(item => dataModel.abilities.cha.total >= item.min);
            dataModel.retainer.max = adjustment.maxRetainers;
            dataModel.retainer.morale = (adjustment.retainerMorale ?? 10);
         }
      }
   }

   getBaseACMod(actor) {
      return actor.system.abilities?.dex.mod ?? 0;
   }

   getAdjustments(abilityScoreKey) {
      return game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${this.abilityScoreMods}`);
   }

   hasMeleeDamageMod(actorData) {
      return actorData.abilities && actorData.abilities.str.mod != 0
   }

   getMeleeDamageMod(actorData) {
      return Number(actorData.abilities.str.mod);
   }

   hasMeleeToHitMod(actor) {
      return actor.system.abilities && actor.system.abilities.str.mod !== 0;
   }

   getMeleeToHitMod(actor) {
      return actor.system.abilities.str.mod;
   }

   hasMissileToHitMod(actor) {
      return actor.system.abilities && actor.system.abilities.dex.mod !== 0;
   }

   getMissileToHitMod(actor) {
      return actor.system.abilities.dex.mod;
   }

   sortForInitiative(aActor, bActor) {
      let result = 0;
      // Compare dexterity, descending order; treat null/undefined as last
      const aDex = aActor.system.abilities?.dex.total;
      const bDex = bActor.system.abilities?.dex.total;
      if (!aDex) {
         if (bDex) {
            result = 1;
         }
      } else if (!bDex) {
         result = -1;
      } else if (aDex !== bDex) {
         result = bDex - aDex;
      }
      return result;
   }

   getInitiativeMod(actor) {
      let result = 0;
      result += actor.system?.mod.initiative || 0;
      if (actor.type !== 'monster') {
         result += actor.system?.abilities?.dex?.mod || 0;
      }
      return result;
   }
}

export class AbilityScoreOriginal extends AbilityScoreBase {
   constructor() {
      super();
   }

   getAdjustments(abilityScoreKey) {
      const allAbilityScores = game.fade.registry.getSystem("userTables").getKeyJson(`ability-mods-${this.abilityScoreMods}`);
      return allAbilityScores[abilityScoreKey];
   }
}