import { FDActorBaseDM } from "../dataModel/FDActorBaseDM.mjs";
import { FDCombatActorData } from '../fields/FDCombatActorField.mjs';

export class FDCombatActorDM extends FDActorBaseDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const combatSchema = FDCombatActorData.defineSchema();
      foundry.utils.mergeObject(baseSchema, combatSchema);
      return baseSchema;
   }

   prepareBaseData() {
      super.prepareBaseData();
      this._prepareMods();
      for (let [key] of Object.entries(this.abilities)) {
         const value = Number(foundry.utils.getProperty(this.abilities, `${key}.value`)) || 0;
         const tempMod = Number(foundry.utils.getProperty(this.abilities, `${key}.tempMod`)) || 0;
         foundry.utils.setProperty(this.abilities, `${key}.total`, value + tempMod);
      }
   }

   prepareDerivedData() {
      this._prepareDerivedAbilities();
      super.prepareDerivedData();
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      return super.migrateData(source);
   }

   _prepareDerivedAbilities() {
      // For monsters
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      const hasAbilityScoreMods = abilityScoreSetting === "withmod";

      
      if (this.parent.type === "character" || hasAbilityScoreMods === true) {

         const settingKey = game.settings.get(game.system.id, "abilityScoreMods");
         const rawTable = game.fade.registry
           .getSystem("userTables")
           ?.getJsonArray(`ability-mods-${settingKey}`);
       
         // The table may be EITHER:
         // 1) simple mode: [ {min, value, ...}, {min, value, ...} ]
         // 2) ability-specific mode: [ { str: [...], dex: [...], ... } ]
         //
         // Convert into a consistent structure:
         // simple → { str: simpleArray, dex: simpleArray, ... }
         // original → use as-is
         let adjustments = {};
       
         if (Array.isArray(rawTable) && rawTable.length > 0) {
           const data = rawTable[0];
       
           if (Array.isArray(data)) {
             // SIMPLE MODE: wrap each ability with the same table
             adjustments = {
               str: data,
               int: data,
               wis: data,
               dex: data,
               con: data,
               cha: data
             };
           } else if (typeof data === "object") {
             adjustments = data;
           }
         }
       
         // Apply modifiers to each ability
         for (let [ability, abilityData] of Object.entries(this.abilities)) {
           const total = Number(abilityData.total) || 0;
       
           // Get table for this ability (simple mode uses same table)
           const table = adjustments[ability] ?? [];
       
           // Sort by min descending and find first matching row
           const sorted = [...table].sort((a, b) => b.min - a.min);
           const row = sorted.find(r => total >= r.min) ?? sorted[sorted.length - 1];
       
           // `value` remains the "primary modifier" for compatibility
           const modValue = Number(row?.value ?? 0);
           foundry.utils.setProperty(this.abilities, `${ability}.mod`, modValue);

           console.log(`Ability: ${ability.toUpperCase()}, Total: ${total}, Mod: ${modValue}`);
       
           // Copy any other modifier fields (hp, missile, loyalty, reaction, etc.)
           for (let [key, value] of Object.entries(row)) {
             if (key === "min" || key === "value") continue;

             console.log(` - Additional Mod: ${key} = ${value}`);

             foundry.utils.setProperty(this.abilities, `${ability}.${key}`, value);
           }
         }
       }
   }

   /**
    * @protected
    */
   async _prepareMods() {
      this.mod.ac = 0;
      this.mod.baseAc = 0;
      this.mod.upgradeAc = null;
      this.mod.upgradeRangedAc = null;
      this.mod.acVsLarge = 0;
      this.mod.initiative = 0;
      this.mod.combat.toHit = 0;
      this.mod.combat.dmg = 0;
      this.mod.combat.toHitRanged = 0;
      this.mod.combat.dmgRanged = 0;
      this.mod.combat.selfDmg = 0;
      this.mod.combat.selfDmgRanged = 0;
      this.mod.combat.selfDmgBreath = 0;
      this.mod.combat.selfDmgBreathScale = 0;
      this.mod.combat.selfDmgMagic = 0;
      this.mod.combat.selfDmgFrost = 0;
      this.mod.combat.selfDmgFire = 0;
      this.mod.combat.selfToHit = 0;
      this.mod.combat.selfToHitRanged = 0;
      // Saving throw mods
      this.mod.save = {};
      this.mod.save.all = 0;
   }
}