/** Localization key prefix for movement mode action ids. */
const MOVEMENT_MODE_LABEL_PREFIX = "FADE.Actor.Movement.mode";

export class ActorMovement {
   /**
    * Derive turn/round/day/run for each movement mode from base + encumbrance modifiers.
    * @param {Actor} actor
    */
   prepareMovementRates(actor) {
      const movement = actor.system.movement;
      const modes = movement?.modes;
      if (!Array.isArray(modes) || modes.length === 0) {
         console.debug(`No movement modes specified for ${actor.name}`);
         return;
      }

      const roundDivisor = game.settings.get(game.system.id, "mvRoundDivisor") ?? 3;
      const runDivisor = game.settings.get(game.system.id, "runRoundDivisor") ?? 1.5;
      const encFactor = movement.modifiers?.encumbrance ?? 1;

      for (let i = 0; i < modes.length; i++) {
         this.prepareModeRates(modes[i], {
            encFactor,
            roundDivisor,
            runDivisor,
            dayDivisor: 5,
         });
      }
   }

   /**
    * Apply FADE default rate formulas to a single mode.
    * @protected
    */
   prepareModeRates(mode, { encFactor, roundDivisor, runDivisor, dayDivisor }) {
      if (mode.base === null || mode.base === undefined) {
         // Authored rates (e.g. ships with null max) — leave turn/round/day/run alone.
         return;
      }

      if (!(mode.base > 0)) {
         return;
      }

      const effective = Math.floor(mode.base * encFactor);
      if (effective <= 0) {
         return;
      }

      mode.turn = effective;
      mode.round = Math.floor(mode.turn / roundDivisor);
      mode.day = Math.floor(mode.turn / dayDivisor);
      mode.run = Math.floor(mode.turn / runDivisor);
   }

   /** Default action id from CONFIG.FADE.Movement.defaultAction. */
   getDefaultAction(): string {
      return CONFIG.FADE?.Movement?.defaultAction ?? "walk";
   }

   /** Action ids from CONFIG.FADE.Movement.actions. */
   getConfiguredActions(): string[] {
      const list = CONFIG.FADE?.Movement?.["actions"];
      return Array.isArray(list) ? list as string[] : [];
   }

   /** i18n key for a movement action id. */
   getActionLabelKey(action: string): string {
      return `${MOVEMENT_MODE_LABEL_PREFIX}.${action}`;
   }

   /** Localized label for a movement action id. */
   getActionLabel(action: string): string {
      if (!action) return "";
      return game.i18n.localize(this.getActionLabelKey(action));
   }

   /**
    * Movement actions from CONFIG.FADE.Movement.actions.
    * @returns {{ id: string, label: string }[]}
    */
   listActions(options: { exclude?: Iterable<string> } = {}) {
      const excluded = new Set(options.exclude ?? []);
      return this.getConfiguredActions()
         .filter((id) => typeof id === "string" && id.length > 0 && !excluded.has(id))
         .map((id) => ({ id, label: this.getActionLabel(id) }));
   }

   /** Create a new mode entry with FADE defaults. */
   createDefaultMode(action?: string, overrides: Record<string, unknown> = {}) {
      const resolved = action || this.getDefaultAction();
      return foundry.utils.mergeObject({
         action: resolved,
         base: 120,
         turn: 120,
         round: null,
         day: null,
         run: null,
      }, overrides);
   }
}
