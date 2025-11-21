import { FDCombatActorDM } from "./FDCombatActorDM.mjs";
import { MonsterTHAC0Calculator } from '../../utils/MonsterTHAC0Calculator.mjs';
import { MonsterXPCalculator } from '../../utils/MonsterXPCalculator.mjs';
import { MonsterData } from '../fields/MonsterField.mjs';

export class MonsterDataModel extends FDCombatActorDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const monsterSchema = MonsterData.defineSchema();
      foundry.utils.mergeObject(baseSchema, monsterSchema);
      return baseSchema;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.details.alignment = this.details.alignment || "Chaotic";
      this.encumbrance.max = this.encumbrance.max || 0;
      // Default all monsters with basic proficiency.
      this.combat.basicProficiency = true;
      this._prepareTHAC0ToHitBonus();
      // Maybe this is the wrong place to do this. We may need to wait until after init.
      this.thbonus = CONFIG.FADE.ToHit.baseTHAC0 - this.thac0.value;
      this._prepareHitPoints();
      this._prepareXP();
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      //source.abilities = {
      //   int: { value: source.details.intelligence }
      //};
      return super.migrateData(source);
   }

   getParsedHD() {
      const classSystem = game.fade.registry.getSystem("classSystem");
      return classSystem.getParsedHD(this.hp.hd);
   }

   /**
    * Calculate average hitpoints based on hitdice.
    */
   _prepareHitPoints() {
      if (this.hp.max == null) {
         const { base, modifier, dieSides } = this.getParsedHD();
         this.hp.value = Math.ceil(((dieSides + 1) / 2) * base) + modifier;
         this.hp.max = this.hp.value;
      }
   }

   _prepareXP() {
      if (this.details.xpAward == null || this.details.xpAward == 0) {
         const xpCalc = new MonsterXPCalculator();
         const { base, modifier, dieSides, sign } = this.getParsedHD();
         if (base > 0 || modifier > 0) {
            const xp = xpCalc.getXP(`${base}${sign}${(modifier != 0 ? modifier : '')}`, this.details.abilityCount);
            this.details.xpAward = xp;
         }
      }
   }

   _prepareTHAC0ToHitBonus() {
      if (this.thac0?.value == null) {
         const thac0Calc = new MonsterTHAC0Calculator();
         this.thac0.value = thac0Calc.getTHAC0(this.hp.hd);
      }
   }
}