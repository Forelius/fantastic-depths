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

      // If this is a character or if monsters have ability score mods...
      if (this.parent.type === 'character' || hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
         const adjustments = game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${abilityScoreMods}`);
         for (let [key] of Object.entries(this.abilities)) {
            const total = Number(foundry.utils.getProperty(this.abilities, `${key}.total`)) || 0;
            const sorted = (adjustments ?? []).sort((a, b) => b.min - a.min);
            const adjustment = sorted.find(item => total >= item.min) ?? sorted[0];
            const modValue = adjustment ? Number(adjustment.value) || 0 : 0;
            foundry.utils.setProperty(this.abilities, `${key}.mod`, modValue);
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