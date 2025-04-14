export class fadeEffect extends ActiveEffect {
   /**
    * Apply this ActiveEffect to a provided Actor.
    * TODO: This method is poorly conceived. Its functionality is static, applying a provided change to an Actor
    * TODO: When we revisit this in Active Effects V2 this should become an Actor method, or a static method
    * @param {Actor} actor                   The Actor to whom this effect should be applied
    * @param {EffectChangeData} change       The change data being applied
    * @returns {*}                           The resulting applied value
    */
   apply(actor, change) {
      if (change.value.startsWith("@actor")) {
         const roll = new Roll(change.value, { actor: actor.getRollData() });
         if (Number(game.version) >= 12) {
            roll.evaluateSync();
         } else {
            roll.evaluate({ async: true });
         }
         change.value = roll.total;
      }
      return super.apply(actor, change);
   }

   /** @override */
   updateDuration() {
      super.updateDuration();
      // Custom logic for second-based durations
      if (this.duration.type === 'seconds') {
         const roundDuration = game.settings.get(game.system.id, "roundDurationSec") ?? 60;
         const turnDuration = game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60;
         const wt = game.time.worldTime;
         const start = (this.duration.startTime || wt);
         const elapsed = wt - start;
         const remaining = this.duration.seconds - elapsed;
         const remainingRounds = (remaining / roundDuration)?.toFixed(0) ?? "--";
         const remainingTurns = (remaining / turnDuration)?.toFixed(2) ?? "--";

         // Dynamically redefine the label
         Object.defineProperty(this.duration, 'label', {
            get: () => `${remainingRounds} rounds/${remainingTurns} turns`,
            configurable: true
         });
      }
   }
}
