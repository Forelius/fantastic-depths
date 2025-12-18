import { CodeMigrate } from "./migration";

export class fadeEffect extends ActiveEffect {
   /**
    * Apply this ActiveEffect to a provided Actor.
    * TODO: This method is poorly conceived. Its functionality is static, applying a provided change to an Actor
    * TODO: When we revisit this in Active Effects V2 this should become an Actor method, or a static method
    * @param {any} actor  The Actor to whom this effect should be applied
    * @param {any} change The change data being applied
    * @returns {*}        The resulting applied value
    */
   apply(actor, change) {
      if (change.value.startsWith("{")) {
         this.#handleAdvancedApply(actor, change);
      } else if (change.value.includes("@actor") || change.value.includes("@system")) {
         this.#applyRollData(change, actor);
      }

      return super.apply(actor, change);
   }

   updateDuration() {
      super.updateDuration();
      // Custom logic for second-based durations
      if (this.duration.type === "seconds") {
         const roundDuration = game.settings.get(game.system.id, "roundDurationSec") ?? 60;
         const turnDuration = game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60;
         const wt = game.time.worldTime;
         const start = (this.duration.startTime || wt);
         const elapsed = wt - start;
         const remaining = this.duration.seconds - elapsed;
         const remainingRounds = (remaining / roundDuration)?.toFixed(0) ?? "--";
         const remainingTurns = (remaining / turnDuration)?.toFixed(2) ?? "--";

         this.durationLabel = `${remainingRounds} rounds/${remainingTurns} turns`;
      }
   }

   #handleAdvancedApply(actor, change) {
      try {
         const parsedChange = JSON.parse(change.value);
         if (parsedChange?.type === "userTableLookup") {
            const userTables = game.fade.registry.getSystem("userTables");
            const roll = new Roll(parsedChange.value, { actor: actor.getRollData() });
            CodeMigrate.rollEvaluateSync(roll);
            change.value = userTables.getBonus(parsedChange.table, roll.total);
         }
      } catch (ex) {
         console.error(`Error handling advanced fadeEffect value. ${change?.key}: ${change?.value}.`, ex);
      }
   }

   #applyRollData(change, actor) {
      const roll = new Roll(change.value, { actor: actor.getRollData(), system: this.parent.system });
      CodeMigrate.rollEvaluateSync(roll);
      change.value = roll.total;
   }
}
