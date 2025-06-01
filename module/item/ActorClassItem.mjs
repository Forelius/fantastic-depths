import { FDItem } from './FDItem.mjs';

export class ActorClassItem extends FDItem {
   /**
    * @override
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   _onUpdate(updateData, options, userId) {
      super._onUpdate(updateData, options, userId);
      if (updateData.system?.level !== undefined) {
         // This is an async method
         this.updatePropertiesFromUpdate(updateData);
      }
   }

   //** Update item properties based on FADE.WeaponMastery */
   async updatePropertiesFromUpdate(updateData) {
      if (this.id && this.actor) {
         const classSystem = game.fade.registry.getSystem("classSystem");
         await classSystem.onActorItemUpdate(this.actor, this, updateData);
      }
   }

   async getInlineDescription() {
      let description = null;
      if ((description?.length > 0) !== true) {
         description = '--';
      }
      return description;
   }
}