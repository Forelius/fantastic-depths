/**
 * Register FADE movement actions and filter token action selection by actor modes.
 */
export function registerTokenMovementActions() {
   if (!CONFIG.Token?.movement) return;
   if (!CONFIG.Token.movement.actions) {
      CONFIG.Token.movement.actions = {};
   }

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

   CONFIG.Token.movement.actions.primary = foundry.utils.mergeObject({
      label: "FADE.Actor.Movement.long",
      icon: "fa-solid fa-person-walking",
      order: -20,
   }, CONFIG.Token.movement.actions.primary ?? {});

   CONFIG.Token.movement.actions.secondary = foundry.utils.mergeObject({
      label: "FADE.Actor.movement2.long",
      icon: "fa-solid fa-person-running",
      order: -19,
   }, CONFIG.Token.movement.actions.secondary ?? {});

   for (const [actionId, config] of Object.entries(CONFIG.Token.movement.actions)) {
      if (!config || typeof config !== "object") continue;
      const actionConfig = config as { canSelect?: unknown };
      actionConfig.canSelect = wrapCanSelect(actionId, actionConfig.canSelect);
   }

   // Prefer FADE primary when core default is walk and actor modes use primary/secondary.
   if (CONFIG.Token.movement.defaultAction === "walk" || !CONFIG.Token.movement.defaultAction) {
      CONFIG.Token.movement.defaultAction = "primary";
   }
}
