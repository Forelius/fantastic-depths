import { fadeActorDataModel } from "./fadeActorDataModel.mjs";

export class MonsterDataModel extends fadeActorDataModel {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema,
         details: new foundry.data.fields.SchemaField({
            morale: new foundry.data.fields.NumberField({ initial: 9 }),
            alignment: new foundry.data.fields.StringField({ initial: "Chaotic" }),
            xpAward: new foundry.data.fields.NumberField({ initial: 5 }),
            abilityCount: new foundry.data.fields.NumberField({ initial: 0 }),
            attacks: new foundry.data.fields.StringField({ initial: "1" }),
            size: new foundry.data.fields.StringField({ initial: "M" }),
            intelligence: new foundry.data.fields.StringField({ initial: "7" }),
            monsterType: new foundry.data.fields.StringField({ initial: "Monster (Common)" }),
            saveAs: new foundry.data.fields.StringField({ initial: "F1" }),
         }),
         na: new foundry.data.fields.SchemaField({
            wandering: new foundry.data.fields.StringField({ initial: "1d6" }),
            lair: new foundry.data.fields.StringField({ initial: "" }),
         }),
         treasure: new foundry.data.fields.StringField({ initial: "" })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.details.alignment = this.details.alignment || "Chaotic";
      this.encumbrance.max = this.encumbrance.max || 0;
      this.thbonus = 19 - this.thac0.value;
      this._prepareHitPoints();      
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareWrestling();
   }

   _prepareWrestling() {
      // Wrestling skill
      const hitDice = this.hp.hd?.match(/^\d+/)[0];
      this.wrestling = this.ac.value;
      if (hitDice) {
         this.wrestling = Math.ceil(hitDice * 2) + this.ac.value;
      }
   }


   /**
    * @override
    * Calculate average hitpoints based on hitdice.
    */
   _prepareHitPoints() {
      if (this.hp.max == 0) {
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

         this.hp.value = Math.ceil((((dieSides + 1) / 2) + modifier) * base);
         this.hp.max = this.hp.value;
      }
   }
}
