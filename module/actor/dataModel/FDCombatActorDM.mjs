import { FDActorBaseDM } from "/systems/fantastic-depths/module/actor/dataModel/FDActorBaseDM.mjs";
import { FDCombatActorData } from '/systems/fantastic-depths/module/actor/fields/FDCombatActorField.mjs';

export class FDCombatActorDM extends FDActorBaseDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const combatSchema = FDCombatActorData.defineSchema();
      foundry.utils.mergeObject(combatSchema, baseSchema);
      return combatSchema;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareMods();
      for (let [key, ability] of Object.entries(this.abilities)) {
         ability.total = ability.value + ability.tempMod;
      }
   }

   /** @override */
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
         for (let [key, ability] of Object.entries(this.abilities)) {
            let adjustment = adjustments.sort((a, b) => b.min - a.min).find(item => ability.total >= item.min);
            ability.mod = adjustment ? adjustment.value : adjustments[0].value;
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