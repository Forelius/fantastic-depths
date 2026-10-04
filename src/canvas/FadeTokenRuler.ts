/**
 * Soft band coloring for token movement measurement.
 * Visual only — no path restrictions. Tip label: value + localized band.
 * Class is created at register time so Foundry's TokenRuler is available.
 */
export function registerFadeTokenRuler() {
   const Base = CONFIG.Token?.rulerClass;
   if (!Base || !CONFIG.Token) return;

   class FadeTokenRuler extends Base {
      /** @override */
      _getSegmentStyle(waypoint) {
         const style = super._getSegmentStyle(waypoint);
         return this.#withBandColor(style, waypoint);
      }

      /** @override */
      _getWaypointStyle(waypoint) {
         const style = super._getWaypointStyle(waypoint);
         return this.#withBandColor(style, waypoint);
      }

      /** @override */
      _getGridHighlightStyle(waypoint, offset) {
         const style = super._getGridHighlightStyle(waypoint, offset);
         return this.#withBandColor(style, waypoint);
      }

      /**
       * Keep Foundry's label context (position, scale, etc.) and replace the
       * distance text with a unitless value + localized band name.
       * @override
       */
      _getWaypointLabelContext(waypoint, state) {
         const context = super._getWaypointLabelContext(waypoint, state);
         if (!context) return context;

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
         context.distance = {
            ...(typeof context.distance === "object" && context.distance ? context.distance : {}),
            total: bandLabel ? `${value} ${bandLabel}` : value,
         };
         return context;
      }

      #withBandColor(style, waypoint) {
         if (!style || typeof style !== "object") return style;
         const color = this.#colorForWaypoint(waypoint);
         return color == null ? style : { ...style, color };
      }

      #colorForWaypoint(waypoint) {
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
