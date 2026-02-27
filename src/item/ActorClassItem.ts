import { ClassSystemBase } from '../sys/registry/ClassSystem.js';
import { FDItem } from './FDItem.js';

export class ActorClassItem extends FDItem {
   /**
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   _onUpdate(changed: object, options: object, userId: string): void {
      super._onUpdate(changed, options, userId);
      this.updatePropertiesFromUpdate(changed);
   }

   //** Update item properties based on FADE.WeaponMastery */
   async updatePropertiesFromUpdate(updateData) {
      if (this.id && this.actor) {
         const classSystem: ClassSystemBase = game.fade.registry.getSystem("classSystem");
         await classSystem.onActorItemUpdate(this.actor, this, updateData);
      }
   }

   async getInlineDescription() {
      return '--';
   }
}