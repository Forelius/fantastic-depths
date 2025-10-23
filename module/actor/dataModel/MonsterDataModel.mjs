import { FDCombatActorDM } from "./FDCombatActorDM.mjs";
import { MonsterTHAC0Calculator } from '../../utils/MonsterTHAC0Calculator.mjs';
import { MonsterXPCalculator } from '../../utils/MonsterXPCalculator.mjs';

export class MonsterDataModel extends FDCombatActorDM {
   static defineSchema() {
      const { fields } = foundry.data;
      const baseSchema = super.defineSchema();
      let monsterSchema = {
         details: new fields.SchemaField({
            morale: new fields.NumberField({ initial: 9 }),
            alignment: new fields.StringField({ initial: "Chaotic" }),
            xpAward: new fields.NumberField({ initial: 5 }),
            abilityCount: new fields.NumberField({ initial: 0 }),
            monsterType: new fields.StringField({ initial: "Monster" }),
            rarity: new fields.StringField({ initial: "Common" }),
            saveAs: new fields.StringField({ initial: "F1" }),
            // Some monsters have spells of a specific class level.
            castAs: new fields.StringField({ initial: null, nullable: true }),
            // Some monsters have the class abilities of a specific class level.
            classAbilityAs: new fields.StringField({ initial: null, nullable: true }),
            level: new fields.NumberField({ initial: 1 })
         }),
         na: new fields.SchemaField({
            wandering: new fields.StringField({ initial: "1d6" }),
            lair: new fields.StringField({ initial: "" }),
         }),
         treasure: new fields.StringField({ initial: "" })         
      };
      foundry.utils.mergeObject(monsterSchema, baseSchema);
      return monsterSchema;
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

   /** @override */
   prepareDerivedData() {
      // Extract class identifier and level from the input
      super.prepareDerivedData();
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
    * @override
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