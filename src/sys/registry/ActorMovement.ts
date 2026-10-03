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
         this.#syncEncumbranceMirrors(actor, modes);
         return;
      }

      const roundDivisor = game.settings.get(game.system.id, "mvRoundDivisor") ?? 3;
      const runDivisor = game.settings.get(game.system.id, "runRoundDivisor") ?? 1.5;
      const encFactor = movement.modifiers?.encumbrance ?? 1;
      const fixedPrimary = movement.modifiers?.fixedPrimary;

      for (let i = 0; i < modes.length; i++) {
         const mode = modes[i];
         this.#prepareModeRates(mode, {
            index: i,
            encFactor,
            fixedPrimary,
            roundDivisor,
            runDivisor,
            dayDivisor: 5,
         });
      }

      this.#syncEncumbranceMirrors(actor, modes);
   }

   /**
    * @protected
    * Apply FADE default rate formulas to a single mode.
    */
   #prepareModeRates(mode, { index, encFactor, fixedPrimary, roundDivisor, runDivisor, dayDivisor }) {
      if (mode.base === null || mode.base === undefined) {
         // Authored rates (e.g. ships with null max) — leave turn/round/day/run alone.
         return;
      }

      let effective: number | null = null;
      if (index === 0 && fixedPrimary != null) {
         effective = fixedPrimary;
      } else if (mode.base > 0) {
         effective = Math.floor(mode.base * encFactor);
      }

      if (effective == null || effective <= 0) {
         return;
      }

      mode.turn = effective;
      mode.round = Math.floor(mode.turn / roundDivisor);
      mode.day = Math.floor(mode.turn / dayDivisor);
      mode.run = Math.floor(mode.turn / runDivisor);
   }

   #syncEncumbranceMirrors(actor, modes) {
      if (!actor.system.encumbrance) return;
      actor.system.encumbrance.mv = modes?.[0]?.turn ?? null;
      actor.system.encumbrance.mv2 = modes?.[1]?.turn ?? null;
   }
}
