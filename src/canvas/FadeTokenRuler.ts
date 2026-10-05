/**
 * Soft band coloring for token movement measurement (PF2e-style).
 * Path solid/dash (obstacle) styling stays with Foundry — we only tint grid
 * highlights and adjust the tip label. Visual only; no path restrictions.
 */
export function registerFadeTokenRuler() {
   const Base = CONFIG.Token?.rulerClass;
   if (!Base || !CONFIG.Token) return;

   class FadeTokenRuler extends Base {
      /**
       * Band colors on reachable grid cells only.
       * Unreachable cells keep Foundry defaults (obstacle path).
       * @override
       */
      _getGridHighlightStyle(waypoint, offset) {
         const style = super._getGridHighlightStyle(waypoint, offset);
         if (!style || waypoint?.unreachable) return style;

         const color = this.#bandColor(waypoint);
         return color == null ? style : { ...style, color };
      }

      /**
       * Keep Foundry's label context (position, scale, cost, etc.) and replace
       * the distance text with a unitless value + localized band name.
       * @override
       */
      _getWaypointLabelContext(waypoint, state) {
         const context = super._getWaypointLabelContext(waypoint, state);
         if (!context || waypoint?.unreachable) return context;

         const tokenDoc = this.token?.document;
         const actorMovement = game.fade?.registry?.getSystem?.("actorMovement");
         if (!tokenDoc || !actorMovement || actorMovement.shouldSkipBandMeasurement(tokenDoc)) {
            return context;
         }

         const distance = this.#distanceOf(waypoint);
         const band = actorMovement.getBand(tokenDoc, distance);
         const value = String(Math.round(distance));
         const bandLabel = band ? actorMovement.getBandLabel(band) : "";

         context.units = "";
         if (typeof context.distance === "object" && context.distance) {
            context.distance.total = bandLabel ? `${value} ${bandLabel}` : value;
            // Hide per-leg delta so the tip stays "value + band" only.
            delete context.distance.delta;
         } else {
            context.distance = { total: bandLabel ? `${value} ${bandLabel}` : value };
         }
         return context;
      }

      #bandColor(waypoint) {
         const tokenDoc = this.token?.document;
         const actorMovement = game.fade?.registry?.getSystem?.("actorMovement");
         if (!tokenDoc || !actorMovement || actorMovement.shouldSkipBandMeasurement(tokenDoc)) {
            return null;
         }
         const band = actorMovement.getBand(tokenDoc, this.#distanceOf(waypoint));
         return band ? actorMovement.getBandColor(band) : null;
      }

      #distanceOf(waypoint): number {
         const measurement = waypoint?.measurement;
         if (!measurement) return 0;
         if (typeof measurement.distance === "number") return measurement.distance;
         if (typeof measurement.cost === "number") return measurement.cost;
         return 0;
      }
   }

   CONFIG.Token.rulerClass = FadeTokenRuler;
}
