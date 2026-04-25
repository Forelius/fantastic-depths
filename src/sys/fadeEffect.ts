import { CodeMigrate } from "./migration.js";

export class fadeEffect extends ActiveEffect {
   /**
    * Apply this ActiveEffect to a provided Actor.
    * @param {any} actor  The Actor to whom this effect should be applied
    * @param {any} change The change data being applied
    * @returns {*}        The resulting applied value
    */
   async _preCreate(data, options, user) {
      await super._preCreate(data, options, user);
      // Foundry auto-sets start for Actor-owned effects in its own _preCreate.
      // Item-owned effects (e.g. ConditionItem) are skipped by that check, so we fill the gap.
      if (this.parent instanceof Item && this.parent.parent instanceof Actor) {
         const seconds = data.duration?.seconds ?? data.duration?.value ?? 0;
         if (seconds > 0 && !foundry.utils.getProperty(data, "start.time")) {
            this.updateSource({ start: CodeMigrate.getEffectStart(this.constructor as typeof ActiveEffect) });
         }
      }
   }

   async _preUpdate(changes, options, user) {
      await super._preUpdate(changes, options, user);
      // When duration is applied via update (create-then-update flow), start must be set explicitly.
      // Foundry only does this in _preCreate, not _preUpdate.
      const seconds = foundry.utils.getProperty(changes, "duration.seconds")
         ?? foundry.utils.getProperty(changes, "duration.value") ?? 0;
      if (seconds > 0 && !this.start?.time) {
         const start = CodeMigrate.getEffectStart(this.constructor as typeof ActiveEffect);
         for (const [key, value] of Object.entries(start)) {
            changes[`start.${key}`] = value;
         }
      }
   }

   // Seconds-based durations are managed by our onUpdateWorldTime; exclude them from
   // Foundry v14's ActiveEffectRegistry to prevent double-expiry conflicts.
   get isExpiryTrackable() {
      const units = this.duration?.units ?? (this.duration as any)?.type;
      if (units === "seconds") return false;
      const base = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(fadeEffect.prototype), "isExpiryTrackable");
      return base?.get?.call(this) ?? false;
   }

   apply(actor, change) {
      if (change.value.startsWith("{")) {
         this.#handleAdvancedApply(actor, change);
      } else if (change.value.includes("@actor") || change.value.includes("@system")) {
         this.#applyRollData(change, actor);
      }

      return super.apply(actor, change);
   }

   updateDuration() {
      const duration = super.updateDuration();
      // Custom logic for second-based durations
      const durationUnits = this.duration.units ?? this.duration.type;
      if (durationUnits === "seconds") {
         const roundDuration = game.settings.get(game.system.id, "roundDurationSec") ?? 60;
         const turnDuration = game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60;
         const wt = game.time.worldTime;
         const start = this.duration.startTime ?? this.start?.time ?? wt;
         const elapsed = wt - start;
         const totalSeconds = this.duration.seconds !== Infinity ? this.duration.seconds : this.duration.value;
         const remaining = totalSeconds - elapsed;
         const remainingRounds = (remaining / roundDuration)?.toFixed(0) ?? "--";
         const remainingTurns = (remaining / turnDuration)?.toFixed(2) ?? "--";

         CodeMigrate.setEffectDurationProps(this.duration, remaining, remaining <= 0);
         this.durationLabel = `${remainingRounds} rounds/${remainingTurns} turns`;
      }
      return duration;
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

