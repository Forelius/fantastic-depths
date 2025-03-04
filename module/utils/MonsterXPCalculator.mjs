export class MonsterXPCalculator {
   MonsterXPCalculator() {

   }

   get xpTable() {
      return {
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
   }

   getXP(hitDiceString, asteriskValue = 0) {
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
         let row = this.xpTable["Under 1"];
         if (numericHitDice >= 1) {
            row = this.xpTable[effectiveHitDice];
         }
         result = row.baseXP + (row.bonus * asteriskValue);
      }

      // Throw error for unmatched entries
      return result;
   }

   parseDiceSpecification(spec, defaultSides = 8) {
      const regex = /(\d*\.?\d+)(?:d(\d+))?([+-]\d+)?/; // Allow for decimal numbers in the number of dice and optional sides
      const match = spec.match(regex);

      if (match) {
         let numberOfDice = parseFloat(match[1]); // Use parseFloat to handle decimal values
         let numberOfSides = match[2] ? parseInt(match[2], 10) : defaultSides; // Use defaultSides if sides are missing
         const modifier = match[3] ? parseInt(match[3], 10) : 0; // Default modifier to 0 if not present
         const modifierSign = modifier !== 0 ? (modifier > 0 ? '+' : '-') : '';
         // If numberOfDice is less than 1, adjust numberOfSides accordingly
         if (numberOfDice < 1) {
            numberOfSides = Math.ceil(numberOfSides * numberOfDice); // Calculate sides based on the fraction
            numberOfDice = 1; // Set numberOfDice to 1 since we are effectively rolling one die
         }

         return {
            numberOfDice,
            numberOfSides,
            modifier,
            modifierSign
         };
      } else {
         return { error: 'Invalid dice specification. Please use the format [number of dice]d[number of sides][modifier].' };
      }
   }
}