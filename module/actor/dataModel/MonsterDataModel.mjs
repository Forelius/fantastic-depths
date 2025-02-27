import { fadeActorDataModel } from "./fadeActorDataModel.mjs";
import { MonsterTHAC0Calculator } from '../../utils/MonsterTHAC0Calculator.mjs';
import { MonsterXPCalculator } from '../../utils/MonsterXPCalculator.mjs';

export class MonsterDataModel extends fadeActorDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema,
         details: new fields.SchemaField({
            morale: new fields.NumberField({ initial: 9 }),
            alignment: new fields.StringField({ initial: "Chaotic" }),
            xpAward: new fields.NumberField({ initial: 5 }),
            abilityCount: new fields.NumberField({ initial: 0 }),
            // This is how many attacks the monster gets
            attacks: new fields.StringField({ initial: "1" }),
            size: new fields.StringField({ initial: "M" }),
            intelligence: new fields.StringField({ initial: "7" }),
            monsterType: new fields.StringField({ initial: "Monster (Common)" }),
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
         treasure: new fields.StringField({ initial: "" }),
         // If enchanted, can only hit with magic weapons or spells.
         isEnchanted: new fields.BooleanField({ initial: false }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.details.alignment = this.details.alignment || "Chaotic";
      this.encumbrance.max = this.encumbrance.max || 0;
      this._prepareTHAC0ToHitBonus();
      this.thbonus = 19 - this.thac0.value;
      this._prepareHitPoints();
      this._prepareXP();
   }

   /** @override */
   prepareDerivedData() {
      // Extract class identifier and level from the input
      const match = this.castAs?.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
      this.level = parsed?.classLevel ?? 1;
      super.prepareDerivedData();
   }

   _getParsedHD() {
      // Regular expression to check for a dice specifier like d<number>
      const diceRegex = /d(\d+)/;
      // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
      const modifierRegex = /([+\-*/]\d+)$/;

      const match = this.hp.hd.match(diceRegex);
      let dieSides = 8;
      if (match) {
         dieSides = parseInt(match[1], 10);
      } else {
         dieSides = 8;
      }

      // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
      let base = this.hp.hd.replace(modifierRegex, ''); // Extract base number
      let modifier = this.hp.hd.match(modifierRegex)?.[0] || 0; // Extract modifier (if any)
      base = parseFloat(base);
      modifier = parseInt(modifier, 10);
      const sign = modifier <= 0 ? "" : "+";
      return { base, modifier, dieSides, sign };
   }

   /**
    * @override
    * Calculate average hitpoints based on hitdice.
    */
   _prepareHitPoints() {
      if (this.hp.max == null) {
         const { base, modifier, dieSides } = this._getParsedHD();
         this.hp.value = Math.ceil(((dieSides + 1) / 2) * base) + modifier;
         this.hp.max = this.hp.value;
      }
   }

   _prepareXP() {
      if (this.details.xpAward == null || this.details.xpAward == 0) {
         const xpCalc = new MonsterXPCalculator();
         const { base, modifier, dieSides, sign } = this._getParsedHD();
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