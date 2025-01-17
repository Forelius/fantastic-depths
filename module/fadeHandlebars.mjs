/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */
export class fadeHandlebars {
   static clamp (value, min, max) {
      return Math.max(min, Math.min(max, value));
   }

   static registerHelpers() {
      Handlebars.registerHelper("infinity", function (value) { return value ?? "∞"; });
      Handlebars.registerHelper('uppercase', function (str) { return str.toUpperCase(); });
      Handlebars.registerHelper('lowercase', function (str) { return str.toLowerCase(); });
      Handlebars.registerHelper("counter", (status, value, max) =>
         status
            ? fadeHandlebars.clamp((100 * value) / max, 0, 100)
            : fadeHandlebars.clamp(100 - (100 * value) / max, 0, 100)
      );
      Handlebars.registerHelper("times", (n, block) => {
         let accum = "";
         // eslint-disable-next-line no-plusplus
         for (let i = 0; i < n; ++i) accum += block.fn(i);
         return accum;
      });
      Handlebars.registerHelper("subtract", (lh, rh) => parseInt(lh, 10) - parseInt(rh, 10));
      Handlebars.registerHelper('formatHitDice', function (hitDice) {
         let result = "1d8";
         // Regular expression to check for a dice specifier like d<number>
         const diceRegex = /\d*d\d+/;
         // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
         const modifierRegex = /([+\-*/]\d+)$/;

         // Check if the input contains a dice specifier
         if (diceRegex.test(hitDice)) {
            // If a dice specifier is found, return the original hitDice
            result = hitDice;
         } else {
            // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
            const base = hitDice.replace(modifierRegex, ''); // Extract base number
            const modifier = hitDice.match(modifierRegex)?.[0] || ''; // Extract modifier (if any)
            // Append 'd8' to the base number, followed by the modifier
            result = base + 'd8' + modifier;
         }

         return result;
      });
      // Register a Handlebars helper to check if an array includes a value
      Handlebars.registerHelper('includes', function (array, value) {
         return array && array.includes(value);
      });
      Handlebars.registerHelper('add', function (a, b) {
         return Number(a) + Number(b);
      });
   }
 }