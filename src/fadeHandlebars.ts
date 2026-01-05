import { ClassSystemBase } from "./sys/registry/ClassSystem.js";
import { Formatter } from "./utils/Formatter.js";

export class fadeHandlebars {
   static clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
   }

   static registerHelpers() {
      Handlebars.registerHelper("fadeor", (...args) => {
         // The last argument Handlebars passes is the options hash � ignore it.
         const values = args.slice(0, -1);
         // Return true if **any** preceding value is truthy, treating empty arrays as falsy.
         return values.some(v => {
            // Empty arrays count as falsy
            if (Array.isArray(v)) {
               return v.length > 0;          // true only when the array has elements
            }
            // All other values use normal JavaScript truthiness
            return Boolean(v);
         });
      });
      Handlebars.registerHelper("isnull", value => { return value === null || value === undefined; });
      Handlebars.registerHelper("camelize", str => Formatter.camelize(str));
      Handlebars.registerHelper("infinity", (value) => value ?? "8");
      Handlebars.registerHelper("uppercase", (str) => str.toUpperCase());
      Handlebars.registerHelper("lowercase", (str) => str.toLowerCase());
      Handlebars.registerHelper("counter", (status, value, max) =>
         status
            ? fadeHandlebars.clamp((100 * value) / max, 0, 100)
            : fadeHandlebars.clamp(100 - (100 * value) / max, 0, 100)
      );
      Handlebars.registerHelper("times", (n, block) => {
         let accum = "";
         for (let i = 0; i < n; ++i) accum += block.fn(i);
         return accum;
      });
      Handlebars.registerHelper("formatHitDice", (hitDice) => {
         const classSystem: ClassSystemBase = game.fade.registry.getSystem("classSystem");
         const { numberOfDice, numberOfSides, modifier, modifierSign } = classSystem.getParsedHD(hitDice);
         const result = `${numberOfDice}d${numberOfSides}${modifierSign}${modifier != 0 ? modifier : ""}`;
         return result;
      });
      // Register a Handlebars helper to check if an array includes a value
      Handlebars.registerHelper("includes", (array, value) => array && array.includes(value));
      Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
      Handlebars.registerHelper("subtract", (lh, rh) => Number(lh) - Number(rh));
      Handlebars.registerHelper("multiply", (a, b) => Number(a) * Number(b));
      // Round down
      Handlebars.registerHelper("divide", (a, b) => Math.floor(Number(a) / Number(b)));
      Handlebars.registerHelper("contextMergeEach", function (array, options) {
         // If the first argument isn�t a proper array, do nothing or handle differently.
         if (!Array.isArray(array)) return "";

         // "parentContext" is whatever "this" was **outside** the helper call.
         // eslint-disable-next-line @typescript-eslint/no-this-alias
         const parentContext = this;
         // We"ll accumulate the rendered output in `result`.
         let result = "";

         // Loop over the array, just like #each.
         for (let i = 0; i < array.length; i++) {
            const item = array[i];

            // Create a new "data frame" so we mimic #each�s index, first, last, etc.
            // (options.data can contain additional metadata that Foundry or Handlebars might track.)
            const data = Handlebars.createFrame(options.data || {});
            data.index = i;
            data.first = i === 0;
            data.last = i === array.length - 1;

            // Merge contexts:
            //  - The parent context (so you can still reference `{{this.something}}` if desired)
            //  - `options.hash` (the extra variables you passed in the template)
            //  - The current item of the array
            // We store the current item under `item`, so you can do `{{item.whatever}}` in the template.
            const mergedContext = Object.assign({}, parentContext, options.hash, {
               item
            });

            // Render the block (`options.fn`) with that merged context.
            // Provide `data` so you can do {{@index}} inside the block if you want.
            result += options.fn(mergedContext, { data });
         }

         return result;
      });
   }
}