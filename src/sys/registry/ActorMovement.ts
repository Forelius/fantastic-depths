/** Localization key prefix for movement mode action ids. */
const MOVEMENT_MODE_LABEL_PREFIX = "FADE.Actor.Movement.mode";
const MOVEMENT_TIMESCALE_LABEL_PREFIX = "FADE.Actor.Movement.timescale";
const MOVEMENT_BAND_LABEL_PREFIX = "FADE.Actor.Movement.band";
const MOVEMENT_FLAG_SCOPE = "movement";

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
      return CONFIG.FADE?.Movement?.defaultAction ?? "ground";
   }

   /** Action ids from CONFIG.FADE.Movement.actions. */
   getConfiguredActions(): string[] {
      const list = CONFIG.FADE?.Movement?.["actions"];
      return Array.isArray(list) ? list as string[] : [];
   }

   /** Timescale ids from CONFIG.FADE.Movement.timescales. */
   getConfiguredTimescales(): string[] {
      const list = CONFIG.FADE?.Movement?.["timescales"];
      return Array.isArray(list) ? list as string[] : [];
   }

   /** Band ids from CONFIG.FADE.Movement.bands. */
   getConfiguredBands(): string[] {
      const list = CONFIG.FADE?.Movement?.["bands"];
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

   /** i18n key for a timescale id. */
   getTimescaleLabelKey(timescale: string): string {
      return `${MOVEMENT_TIMESCALE_LABEL_PREFIX}.${timescale}`;
   }

   /** Localized label for a timescale id. */
   getTimescaleLabel(timescale: string): string {
      if (!timescale) return "";
      return game.i18n.localize(this.getTimescaleLabelKey(timescale));
   }

   /** i18n key for a band id. */
   getBandLabelKey(band: string): string {
      return `${MOVEMENT_BAND_LABEL_PREFIX}.${band}`;
   }

   /** Localized label for a band id. */
   getBandLabel(band: string): string {
      if (!band) return "";
      return game.i18n.localize(this.getBandLabelKey(band));
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

   /** Token flag path segment for movement overrides. */
   getMovementFlagScope(): string {
      return MOVEMENT_FLAG_SCOPE;
   }

   /** Raw timescale override on the token, or null if inferred. */
   getTimescaleOverride(tokenDoc): string | null {
      const value = tokenDoc?.getFlag?.(game.system.id, `${MOVEMENT_FLAG_SCOPE}.timescale`);
      const timescales = this.getConfiguredTimescales();
      return typeof value === "string" && timescales.includes(value) ? value : null;
   }

   /**
    * Persist or clear timescale override on the token.
    * @param key Timescale id, or null to clear (use inference).
    */
   async setTimescale(tokenDoc, key: string | null) {
      const scope = `${MOVEMENT_FLAG_SCOPE}.timescale`;
      if (!key) {
         await tokenDoc.unsetFlag(game.system.id, scope);
         return;
      }
      const timescales = this.getConfiguredTimescales();
      if (!timescales.includes(key)) return;
      await tokenDoc.setFlag(game.system.id, scope, key);
   }

   /** Infer timescale: round if token is in an active combat, else turn. */
   inferTimescale(tokenDoc): string {
      const combat = game.combat;
      if (combat?.started && tokenDoc?.id) {
         const inCombat = combat.combatants?.some((c) => c.tokenId === tokenDoc.id);
         if (inCombat) return "round";
      }
      return "turn";
   }

   /** Effective timescale: flag override → inference → turn. */
   getTimescale(tokenDoc): string {
      return this.getTimescaleOverride(tokenDoc) ?? this.inferTimescale(tokenDoc) ?? "turn";
   }

   /** Normalize retired core/FADE action ids (walk → ground). */
   normalizeAction(action: string | null | undefined): string | null {
      if (!action) return null;
      return action === "walk" ? "ground" : action;
   }

   /** Mode matching the token's movementAction, else first mode. */
   getModeForToken(tokenDoc) {
      const modes = tokenDoc?.actor?.system?.movement?.modes;
      if (!Array.isArray(modes) || modes.length === 0) return null;
      const action = this.normalizeAction(tokenDoc.movementAction);
      return modes.find((m) => m?.action === action) ?? modes[0] ?? null;
   }

   /** True when the token's movement action should skip band styling. */
   shouldSkipBandMeasurement(tokenDoc): boolean {
      const action = this.normalizeAction(tokenDoc?.movementAction);
      if (!action) return true;
      const config = CONFIG.Token?.movement?.["actions"]?.[action];
      if (config?.measure === false) return true;
      const mode = this.getModeForToken(tokenDoc);
      if (!mode) return true;
      const timescale = this.getTimescale(tokenDoc);
      const normal = mode[timescale];
      return !(typeof normal === "number" && normal >= 0);
   }

   /**
    * Band distance ceilings for the token's current form + timescale.
    * @returns {{ slow: number, normal: number, sprint: number } | null}
    */
   getBandThresholds(tokenDoc) {
      if (this.shouldSkipBandMeasurement(tokenDoc)) return null;
      const mode = this.getModeForToken(tokenDoc);
      const timescale = this.getTimescale(tokenDoc);
      const normal = Number(mode[timescale]);
      if (!(normal >= 0)) return null;

      const slowFactor = CONFIG.FADE?.Movement?.["slowFactor"] ?? 0.5;
      const slow = Math.floor(normal * slowFactor);
      // Round-pace sprint uses derived run; turn/day sprint max equals normal for now.
      const sprint = timescale === "round" && typeof mode.run === "number" && mode.run >= 0
         ? mode.run
         : normal;

      return { slow, normal, sprint: Math.max(sprint, normal) };
   }

   /** Band key for a cumulative distance, or null when bands do not apply. */
   getBand(tokenDoc, distance: number): string | null {
      const thresholds = this.getBandThresholds(tokenDoc);
      if (!thresholds) return null;
      const d = Number(distance) || 0;
      if (d <= thresholds.slow) return "slow";
      if (d <= thresholds.normal) return "normal";
      if (d <= thresholds.sprint) return "sprint";
      return "over";
   }

   /** Configured color for a band key. */
   getBandColor(band: string): number | null {
      const colors = CONFIG.FADE?.Movement?.["bandColors"];
      const value = colors?.[band];
      return typeof value === "number" ? value : null;
   }
}
