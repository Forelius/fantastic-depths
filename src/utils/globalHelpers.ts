// src/globalHelpers.ts
function asBag(value: unknown): asserts value is PropertyBag { };

/**
 * Assign `value` to a nested key inside a PropertyBag.
 *
 * @param root   The top‑level bag (e.g. `update.details`).
 * @param path   Array of keys that leads to the target property.
 * @param value  Value to store.
 */
export function setBag(
   root: unknown,                     // can be unknown, any, or PropertyBag
   path: (string | number | symbol)[],
   value: unknown
): void {
   // First make sure the root really is a PropertyBag.
   asBag(root);
   let cur: PropertyBag = root;       // now the compiler knows it’s a bag

   // Walk all keys except the last one, asserting each step.
   for (let i = 0; i < path.length - 1; ++i) {
      const key = path[i] as string;
      const next = cur[key];
      asBag(next);                     // ensure the next level is a bag
      cur = next as PropertyBag;       // move deeper
   }

   // Final assignment
   const finalKey = path[path.length - 1] as string;
   cur[finalKey] = value;
}