/** Scene flag key for exploration movement-history recording. */
const EXPLORATION_FLAG = "exploration.active";

/**
 * Thin helpers for scene-scoped exploration mode.
 * Suspend vs combat is derived from live Combat state — no mirrored pause flag.
 */
export class ExplorationMode {
   static isActive(scene): boolean {
      if (!scene?.getFlag) return false;
      return scene.getFlag(game.system.id, EXPLORATION_FLAG) === true;
   }

   static async start(scene): Promise<void> {
      if (!scene || !game.user.isGM) return;
      await scene.setFlag(game.system.id, EXPLORATION_FLAG, true);
   }

   static async stop(scene): Promise<void> {
      if (!scene || !game.user.isGM) return;
      await scene.unsetFlag(game.system.id, EXPLORATION_FLAG);
   }

   /** True when any started Combat belongs to this scene. */
   static hasStartedCombat(scene): boolean {
      if (!scene?.id || !game.combats) return false;
      const sceneId = scene.id;
      return game.combats.some((combat) => {
         if (!combat.started) return false;
         const combatSceneId = combat.scene?.id ?? combat.scene;
         return combatSceneId === sceneId;
      });
   }

   /** Active and not yielded to a started encounter on that scene. */
   static isRecording(scene): boolean {
      return this.isActive(scene) && !this.hasStartedCombat(scene);
   }

   /**
    * Clear Foundry movement history for all tokens on the scene.
    * Used when the turn tracker crosses an exploration turn boundary.
    */
   static async clearSceneHistories(scene): Promise<void> {
      if (!scene?.tokens) return;
      const tokens = scene.tokens.contents ?? [];
      await Promise.all(
         tokens.map((token) => token.clearMovementHistory?.() ?? Promise.resolve())
      );
   }

   /** Clear histories on every scene that currently has exploration active. */
   static async clearActiveSceneHistories(): Promise<void> {
      if (!game.scenes) return;
      const scenes = game.scenes.filter((scene) => this.isActive(scene));
      await Promise.all(scenes.map((scene) => this.clearSceneHistories(scene)));
   }

   /** Status for the viewed scene (turn tracker UI). */
   static getViewedStatus(): {
      sceneId: string | null;
      sceneName: string;
      active: boolean;
      suspended: boolean;
      recording: boolean;
      status: "off" | "active" | "suspended";
   } {
      const scene = game.scenes?.viewed ?? null;
      const active = this.isActive(scene);
      const suspended = active && this.hasStartedCombat(scene);
      const recording = active && !suspended;
      const status = !active ? "off" : suspended ? "suspended" : "active";
      return {
         sceneId: scene?.id ?? null,
         sceneName: scene?.name ?? "",
         active,
         suspended,
         recording,
         status,
      };
   }
}
