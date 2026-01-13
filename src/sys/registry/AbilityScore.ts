const { NumberField, SchemaField } = foundry.data.fields;

export class AbilityScoreBase {
   abilityScoreSetting: string;
   hasAbilityScoreMods: boolean;
   abilityScoreMods: string;
   constructor() {
      this.abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      this.hasAbilityScoreMods = this.abilityScoreSetting === "withmod";
      this.abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
   }

   prepareBaseData(dataModel) {
      for (const [key] of Object.entries(dataModel.abilities)) {
         const value = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.value`)) || 0;
         const tempMod = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.tempMod`)) || 0;
         foundry.utils.setProperty(dataModel.abilities, `${key}.total`, value + tempMod);
      }
   }

   prepareDerivedData(dataModel) {
      // If this is a character or if monsters have ability score mods...
      if (dataModel.parent.type === "character" || this.hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         for (const [key] of Object.entries(dataModel.abilities)) {
            const adjustments = this.getAdjustments(key);
            const total = Number(foundry.utils.getProperty(dataModel.abilities, `${key}.total`)) || 0;
            const sorted = (adjustments ?? []).sort((a, b) => b.min - a.min);
            const adjustment = sorted.find(item => total >= item.min) ?? sorted[0];
            const modValue = adjustment ? Number(adjustment.value) || 0 : 0;
            foundry.utils.setProperty(dataModel.abilities, `${key}.mod`, modValue);
         }
      }
   }

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   getAdjustments(abilityScoreKey) {
      return game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${this.abilityScoreMods}`);
   }
}

export class AbilityScoreRetro extends AbilityScoreBase {
   constructor() {
      super();
   }

   /**
    * For the character and monster data models
    * @returns {SchemaField} A new SchemaField containing all of the ability scores.
    */
   defineSchemaForActor() {
      return new SchemaField({
         str: new SchemaField({
            // The base ability score value.
            value: new NumberField({ initial: 10 }),
            // The ability score total, after active effects and tempMod applied.
            total: new NumberField({ initial: 10 }),
            // The ability score derived modifier. Sometimes called adjustment.
            mod: new NumberField({ initial: 0 }),
            // A temporary modifier applied to total.
            tempMod: new NumberField({ initial: 0 }),
            // The minimum value required for this ability score.
            min: new NumberField({ initial: 1 })
         }),
         int: new SchemaField({
            value: new NumberField({ initial: 10 }),
            total: new NumberField({ initial: 10 }),
            mod: new NumberField({ initial: 0 }),
            tempMod: new NumberField({ initial: 0 }),
            min: new NumberField({ initial: 1 })
         }),
         wis: new SchemaField({
            value: new NumberField({ initial: 10 }),
            total: new NumberField({ initial: 10 }),
            mod: new NumberField({ initial: 0 }),
            tempMod: new NumberField({ initial: 0 }),
            min: new NumberField({ initial: 1 })
         }),
         dex: new SchemaField({
            value: new NumberField({ initial: 10 }),
            total: new NumberField({ initial: 10 }),
            mod: new NumberField({ initial: 0 }),
            tempMod: new NumberField({ initial: 0 }),
            min: new NumberField({ initial: 1 })
         }),
         con: new SchemaField({
            value: new NumberField({ initial: 10 }),
            total: new NumberField({ initial: 10 }),
            mod: new NumberField({ initial: 0 }),
            tempMod: new NumberField({ initial: 0 }),
            min: new NumberField({ initial: 1 })
         }),
         cha: new SchemaField({
            value: new NumberField({ initial: 10 }),
            total: new NumberField({ initial: 10 }),
            mod: new NumberField({ initial: 0 }),
            loyaltyMod: new NumberField({ initial: 0 }),
            tempMod: new NumberField({ initial: 0 }),
            min: new NumberField({ initial: 1 })
         }),
      });
   }

   defineSchemaForClass() {
      return new SchemaField({
         str: new SchemaField({
            min: new NumberField({ nullable: true }),
         }),
         int: new SchemaField({
            min: new NumberField({ nullable: true }),
         }),
         wis: new SchemaField({
            min: new NumberField({ nullable: true }),
         }),
         dex: new SchemaField({
            min: new NumberField({ nullable: true }),
         }),
         con: new SchemaField({
            min: new NumberField({ nullable: true }),
         }),
         cha: new SchemaField({
            min: new NumberField({ nullable: true }),
         })
      });
   }

   prepareDerivedData(dataModel) {
      super.prepareDerivedData(dataModel);
      // If this is a character or if monsters have ability score mods...
      if (dataModel.parent.type === "character" || this.hasAbilityScoreMods === true) {
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

   getSavingThrowMod(actor, action, item) {
      let result = 0;
      if (action === "magic") {
         result = actor.system.abilities?.wis?.mod ?? 0;
      }

      // Factor in the special ability item's modifier, if it has one.
      if (item?.system.abilityMod?.length > 0) {
         let abilityMod = actor.system.abilities[item.system.abilityMod].mod;
         if (abilityMod != 0) {
            // If this is a roll under, then the ability score modifier should subtract from the roll.
            if (item.system.operator == "lt" || item.system.operator == "lte" || item.system.operator == "<" || item.system.operator == "<=") {
               abilityMod = -abilityMod;
            }
         }
         result += abilityMod;
      }

      return result;
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
      if (actor.type === "character") {
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