import { ExplorationMode } from "./ExplorationMode.js";

/**
 * Records movement history during exploration (all tokens on an active scene)
 * or during encounters (Foundry default: combatants in a started combat).
 */
export class fadeTokenDocument extends TokenDocument {
   /**
    * @override
    */
   _shouldRecordMovementHistory(): boolean {
      const scene = this.parent;
      if (ExplorationMode.hasStartedCombat(scene)) {
         return super._shouldRecordMovementHistory();
      }
      return ExplorationMode.isActive(scene);
   }
}
