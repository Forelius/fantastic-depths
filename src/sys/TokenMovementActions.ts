import { getMovementActionLabelKey } from "../actor/dataModel/movement/MovementModeData.js";

/**
 * Register FADE movement actions and filter token action selection by actor modes.
 */
export function registerTokenMovementActions() {
   if (!CONFIG.Token?.movement) return;
   if (!CONFIG.Token.movement["actions"]) {
      CONFIG.Token.movement["actions"] = {};
   }

   const catalog = CONFIG.Token.movement["actions"] as Record<string, Record<string, unknown>>;

   const hasMode = (tokenDoc, actionId) => {
      const modes = tokenDoc?.actor?.system?.movement?.modes;
      return Array.isArray(modes) && modes.some((m) => m.action === actionId);
   };

   const wrapCanSelect = (actionId, existing) => {
      return (token) => {
         const doc = token?.document ?? token;
         if (!hasMode(doc, actionId)) return false;
         if (typeof existing === "function") return existing(token);
         if (existing === false) return false;
         return true;
      };
   };

   // label is the same i18n key derived from the action id (not a separate mapping)
   catalog.primary = foundry.utils.mergeObject({
      label: getMovementActionLabelKey("primary"),
      icon: "fa-solid fa-person-walking",
      order: -20,
   }, catalog.primary ?? {});

   catalog.secondary = foundry.utils.mergeObject({
      label: getMovementActionLabelKey("secondary"),
      icon: "fa-solid fa-person-running",
      order: -19,
   }, catalog.secondary ?? {});

   for (const [actionId, config] of Object.entries(catalog)) {
      if (!config || typeof config !== "object") continue;
      config.canSelect = wrapCanSelect(actionId, config.canSelect);
   }

   // Prefer FADE primary when core default is walk and actor modes use primary/secondary.
   if (CONFIG.Token.movement.defaultAction === "walk" || !CONFIG.Token.movement.defaultAction) {
      CONFIG.Token.movement.defaultAction = "primary";
   }
}
