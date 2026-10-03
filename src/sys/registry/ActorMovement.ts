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
}
