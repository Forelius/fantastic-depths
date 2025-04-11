export class fadeEffect extends ActiveEffect {
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
