const { NumberField, StringField } = foundry.data.fields;

/** Localization key prefix for movement mode action ids. */
const MOVEMENT_MODE_LABEL_PREFIX = "FADE.Actor.Movement.mode";

/** A single actor movement mode (parent locomotion entry). */
export class MovementModeData extends foundry.abstract.DataModel {
   static defineSchema() {
      return {
         action: new StringField({ required: true, initial: "primary" }),
         base: new NumberField({ nullable: true, initial: 120 }),
         turn: new NumberField({ nullable: true, initial: 120 }),
         round: new NumberField({ nullable: true, initial: null }),
         day: new NumberField({ nullable: true, initial: null }),
         run: new NumberField({ nullable: true, initial: null }),
      };
   }
}

/** i18n key for a movement action id. */
export function getMovementActionLabelKey(action: string): string {
   return `${MOVEMENT_MODE_LABEL_PREFIX}.${action}`;
}

/**
 * Localized display name for a movement action id.
 * The action id is the localization key suffix under FADE.Actor.Movement.mode.
 */
export function getMovementActionLabel(action: string): string {
   return game.i18n.localize(getMovementActionLabelKey(action));
}

export function createDefaultMovementMode(action = "primary", overrides: Record<string, unknown> = {}) {
   return foundry.utils.mergeObject({
      action,
      base: action === "primary" ? 120 : 0,
      turn: action === "primary" ? 120 : 0,
      round: null,
      day: null,
      run: null,
   }, overrides);
}
