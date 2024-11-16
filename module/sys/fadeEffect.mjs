export class fadeEffect extends ActiveEffect {
   /** @override */
   updateDuration() {
      super.updateDuration();
      // Custom logic for second-based durations
      if (this.duration.type === 'seconds') {
         const wt = game.time.worldTime;
         const start = (this.duration.startTime || wt);
         const elapsed = wt - start;
         const remaining = this.duration.seconds - elapsed;
         const remainingRounds = remaining / 10;
         const remainingTurns = remaining / 600;

         // Dynamically redefine the label
         Object.defineProperty(this.duration, 'label', {
            get: () => `${remainingRounds} rounds/${remainingTurns} turns`,
            configurable: true
         });
      }
   }
}
