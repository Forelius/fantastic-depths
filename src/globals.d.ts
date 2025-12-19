/* eslint-disable @typescript-eslint/no-explicit-any */
// globals.d.ts
export { };

declare global {
   /** All usages of `MyGlobal` will be typed as `any`. */
   type Token = any;
   // Base case – a leaf value can be any *known* type.
   // We use `unknown` instead of `any` so the compiler forces you to
   // narrow the value before you can use it.
   type Leaf = unknown;
   // Recursive definition – each key maps to either a leaf value
   // or another PropertyBag, allowing unlimited nesting.
   type PropertyBag = {
      [K: string]: Leaf | PropertyBag;
   };   
}