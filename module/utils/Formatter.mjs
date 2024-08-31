class Formatter {
    static formatOrdinal(number) {
      const suffixes = ["th", "st", "nd", "rd"];
      const remainder = number % 100;
      return number + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
   }

   // You can add more static methods here as needed
   // static someOtherFormatterMethod() {
   //     ...
   // }
}
export default Formatter;