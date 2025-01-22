// actor-character.mjs
import { ClassItem } from "../item/ClassItem.mjs";
import { fadeActor } from './fadeActor.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class MonsterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareSavingThrows();
      this._prepareWrestling();
      this._prepareXP();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   _prepareWrestling() {
      // Wrestling skill
      const data = this.system;
      const hitDice = data.hp.hd?.match(/^\d+/)[0];
      let wrestling = 0;
      if (hitDice) {
         wrestling = Math.ceil(hitDice * 2);
      }
      // Determine if the monster is wearing any non-natural armor.
      const hasArmor = this.items.some(item => item.type === 'armor' && item.system.equipped === true && item.system.natural === false);
      if (hasArmor) {
         wrestling += data.ac.value;
      } else {
         wrestling += 9;
      }
      this.system.wrestling = wrestling;
   }

   async _prepareSavingThrows() {
      const saveAs = this.system.details.saveAs ?? null;
      if (saveAs) {
         const savesData = ClassItem.getClassSavesByCode(saveAs, this);
         if (savesData) {
            await this._setupSavingThrows(savesData);
            //this.system._prepareSavingThrows(savesData);
         }
      }
   }

   _prepareXP() {
      if (this.system.details.xpAward == null || this.system.details.xpAward == 0) {
         const { base, modifier, dieSides, sign } = this.system._getParsedHD();
         if (base > 0 || modifier > 0) {
            const xp = MonsterXPCalculator.getXP(`${base}${sign}${(modifier != 0 ? modifier : '')}`, this.system.details.abilityCount);
            this.system.details.xpAward = xp;
         }
      }
   }
}

export class MonsterXPCalculator {
   static xpTable = {
      "Under 1": { baseXP: 5, bonus: 1 }, "1": { baseXP: 10, bonus: 3 }, "1+": { baseXP: 15, bonus: 4 },
      "2": { baseXP: 20, bonus: 5 }, "2+": { baseXP: 25, bonus: 10 }, "3": { baseXP: 35, bonus: 15 },
      "3+": { baseXP: 50, bonus: 25 }, "4": { baseXP: 75, bonus: 50 }, "4+": { baseXP: 125, bonus: 75 },
      "5": { baseXP: 175, bonus: 125 }, "5+": { baseXP: 225, bonus: 175 }, "6": { baseXP: 275, bonus: 225 },
      "6+": { baseXP: 350, bonus: 300 }, "7": { baseXP: 450, bonus: 400 }, "7+": { baseXP: 550, bonus: 475 },
      "8": { baseXP: 650, bonus: 550 }, "8+": { baseXP: 775, bonus: 625 }, "9": { baseXP: 900, bonus: 700 },
      "10": { baseXP: 1000, bonus: 750 }, "11": { baseXP: 1100, bonus: 800 }, "12": { baseXP: 1250, bonus: 875 },
      "13": { baseXP: 1350, bonus: 950 }, "14": { baseXP: 1500, bonus: 1000 }, "15": { baseXP: 1650, bonus: 1050 },
      "16": { baseXP: 1850, bonus: 1100 }, "17": { baseXP: 2000, bonus: 1150 }, "18": { baseXP: 2125, bonus: 1350 },
      "19": { baseXP: 2250, bonus: 1550 }, "20": { baseXP: 2375, bonus: 1800 }
   };

   static getXP(hitDiceString, asteriskValue = 0) {
      let result = 0;
      let effectiveHitDice = hitDiceString;
      let numericHitDice = 0;

      // Parse the hit dice string
      if (hitDiceString.includes("+")) {
         effectiveHitDice = hitDiceString.split("+")[0];
         numericHitDice = parseFloat(effectiveHitDice);
         effectiveHitDice += "+";
      } else if (hitDiceString.includes("-")) {
         effectiveHitDice = hitDiceString.split("-")[0];
         numericHitDice = parseFloat(effectiveHitDice);
      } else {
         numericHitDice = parseFloat(effectiveHitDice);
      }

      if (numericHitDice >= 21) {
         // Procedural handling for HD >= 21
         const baseXP = 2500 + ((numericHitDice - 20) * 250);
         const bonus = 2000 + ((numericHitDice - 20) * 250);
         result = baseXP + (bonus * asteriskValue);
      } else {
         let row = MonsterXPCalculator.xpTable["Under 1"];
         if (numericHitDice >= 1) {
            row = MonsterXPCalculator.xpTable[effectiveHitDice];
         }
         result = row.baseXP + (row.bonus * asteriskValue);
      }

      // Throw error for unmatched entries
      return result;
   }
}