import { registerFadeTokenRuler } from "../canvas/FadeTokenRuler.js";

/**
 * Register CONFIG.FADE.Movement.actions on Foundry's token movement catalog
 * and filter canSelect by the actor's modes[]. Labels use FADE.Actor.Movement.mode.<action>.
 * Also installs the band-aware token ruler.
 */
export function registerTokenMovementActions() {
   registerFadeTokenRuler();
   if (!CONFIG.Token?.movement) return;
   if (!CONFIG.Token.movement["actions"]) {
      CONFIG.Token.movement["actions"] = {};
   }

   const catalog = CONFIG.Token.movement["actions"] as Record<string, Record<string, unknown>>;
   const actorMovement = game.fade.registry.getSystem("actorMovement");
   const fadeActions: string[] = actorMovement.getConfiguredActions();
   const defaultAction = actorMovement.getDefaultAction();

   // Prefer FADE's default (ground) over core's walk.
   CONFIG.Token.movement["defaultAction"] = defaultAction;

   const defaultIcons: Record<string, string> = {
      ground: "fa-solid fa-person-walking",
      fly: "fa-solid fa-person-fairy",
      swim: "fa-solid fa-person-swimming",
      burrow: "fa-solid fa-person-digging",
      climb: "fa-solid fa-person-through-window",
      primary: "fa-solid fa-person-walking",
      secondary: "fa-solid fa-person-running",
   };

   // Seed ground from core walk visuals when ground is not yet registered.
   if (fadeActions.includes("ground") && !catalog.ground && catalog.walk) {
      catalog.ground = foundry.utils.deepClone(catalog.walk);
   }

   for (const actionId of fadeActions) {
      const existing = catalog[actionId] ?? {};
      catalog[actionId] = foundry.utils.mergeObject(existing, {
         label: actorMovement.getActionLabelKey(actionId),
         icon: existing.icon ?? defaultIcons[actionId] ?? "fa-solid fa-person-walking",
      });
   }

   // Keep core walk for terrain difficulty keys, but do not offer it in the UI.
   if (catalog.walk && typeof catalog.walk === "object" && !fadeActions.includes("walk")) {
      catalog.walk.canSelect = () => false;
   }

   const hasMode = (tokenDoc, actionId) => {
      const modes = tokenDoc?.actor?.system?.movement?.modes;
      return Array.isArray(modes) && modes.some((m) => m.action === actionId);
   };

   for (const actionId of fadeActions) {
      const config = catalog[actionId];
      if (!config || typeof config !== "object") continue;
      if (config.canSelect === false) continue;
      const existing = config.canSelect;
      config.canSelect = (token) => {
         const doc = token?.document ?? token;
         if (!hasMode(doc, actionId)) return false;
         if (typeof existing === "function") return existing(token);
         return true;
      };
   }
}
