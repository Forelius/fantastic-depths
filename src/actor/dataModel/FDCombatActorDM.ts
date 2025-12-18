import { FDActorBaseDM } from "../dataModel/FDActorBaseDM.js";
import { FDCombatActorData } from '../fields/FDCombatActorField.js';

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
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      abilityScoreSys.prepareBaseData(this);
   }

   prepareDerivedData() {
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      abilityScoreSys.prepareDerivedData(this);
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

