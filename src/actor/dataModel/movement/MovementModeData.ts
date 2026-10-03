const { NumberField, StringField } = foundry.data.fields;

/** A single actor movement mode (parent locomotion entry). */
export class MovementModeData extends foundry.abstract.DataModel {
   static defineSchema() {
      return {
         action: new StringField({ required: true, initial: "primary" }),
         label: new StringField({ required: false, blank: true, initial: "" }),
         base: new NumberField({ nullable: true, initial: 120 }),
         turn: new NumberField({ nullable: true, initial: 120 }),
         round: new NumberField({ nullable: true, initial: null }),
         day: new NumberField({ nullable: true, initial: null }),
         run: new NumberField({ nullable: true, initial: null }),
      };
   }
}

export function createDefaultMovementMode(action = "primary", overrides: Record<string, unknown> = {}) {
   return foundry.utils.mergeObject({
      action,
      label: "",
      base: action === "primary" ? 120 : 0,
      turn: action === "primary" ? 120 : 0,
      round: null,
      day: null,
      run: null,
   }, overrides);
}

/** Map a legacy movement / movement2 object into a mode entry. */
export function legacyRatesToMode(legacy: Record<string, unknown> | null | undefined, action: string) {
   if (!legacy || typeof legacy !== "object") {
      return createDefaultMovementMode(action, { base: 0, turn: 0 });
   }
   return {
      action,
      label: "",
      base: legacy.max !== undefined ? legacy.max : (action === "primary" ? 120 : 0),
      turn: legacy.turn ?? null,
      round: legacy.round ?? null,
      day: legacy.day ?? null,
      run: legacy.run ?? null,
   };
}

/** True when legacy secondary data should become a mode. */
export function isMeaningfulLegacySecondary(legacy: Record<string, unknown> | null | undefined): boolean {
   if (!legacy || typeof legacy !== "object") return false;
   const max = legacy.max as number | null | undefined;
   const turn = Number(legacy.turn) || 0;
   if (typeof max === "number" && max > 0) return true;
   if (max === null) {
      return [legacy.turn, legacy.round, legacy.day, legacy.run].some((v) => v != null && v !== 0);
   }
   return turn > 0;
}
