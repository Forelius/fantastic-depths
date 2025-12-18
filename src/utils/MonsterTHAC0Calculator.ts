export class MonsterTHAC0Calculator {
   /**
    * This currently assumes Dark Dungeons THAC0 for monsters.
    * @param {any} hitDiceString
    * @returns
    */
   getTHAC0(hitDiceString) {
      let result = 0;
      let effectiveHitDice = hitDiceString;
      let numericHitDice = 0;

      // Parse the hit dice string
      if (hitDiceString.includes("+")) {
         effectiveHitDice = hitDiceString.split("+")[0];
         numericHitDice = parseFloat(effectiveHitDice) + 1;
         effectiveHitDice += "+";
      } else if (hitDiceString.includes("-")) {
         effectiveHitDice = hitDiceString.split("-")[0];
         numericHitDice = parseFloat(effectiveHitDice) - 1;
      } else {
         numericHitDice = parseFloat(effectiveHitDice);
      }

      if (numericHitDice <= 9) {
         result = 20 - Math.floor(numericHitDice);
      }
      else if (numericHitDice >= 10 && numericHitDice <= 27) {
         result = Math.floor(20 - (9 + (numericHitDice - 9) / 2));
      }
      else if (numericHitDice > 27 && numericHitDice <= 35) {
         result = 2;
      } else {
         result = 1;
      }

      // Throw error for unmatched entries
      return result;
   }
}
