export class Formatter {
    static formatOrdinal(number) {
      const suffixes = ["th", "st", "nd", "rd"];
      const remainder = number % 100;
      return number + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
   }

   static camelize(str) {
      return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
         return index === 0 ? word.toUpperCase() : word.toLowerCase();
      }).replace(/\s+/g, '');
   }
}
