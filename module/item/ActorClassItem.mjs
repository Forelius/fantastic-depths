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

   //async getClass(className, level) {
   //   // Replace hyphen with underscore for "Magic-User"
   //   const nameInput = className.toLowerCase();
   //   const classItem = await fadeFinder.getClass(nameInput);
   //   if (!classItem) {
   //      if (nameInput !== null && nameInput !== '') {
   //         console.warn(`Class not found ${this.system.details.class}.`);
   //      }
   //      return;
   //   }
   //   const levelData = classData.levels.find(level => level === currentLevel);
   //   const nameLevel = classData.levels.find(level => level === 9);
   //   let title = levelData.system.details.title;
   //   if (title == "" || title == null || title == prevLevelData?.title) {
   //      const ordinalized = Formatter.formatOrdinal(level);
   //      title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
   //   }
   //   return { classItem, levelData, title };
   //}

   async getInlineDescription() {
      let description = null;
      if ((description?.length > 0) !== true) {
         description = '--';
      }
      return description;
   }
}