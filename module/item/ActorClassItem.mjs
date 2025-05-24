import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { FDItem } from './FDItem.mjs';

export class ActorClassItem extends FDItem {
   /**
    * @override
    * @param {any} changed
    * @param {any} options
    * @param {any} userId
    */
   _onUpdate(changed, options, userId) {
      super._onUpdate(changed, options, userId);
      if (changed.system?.level !== undefined) {
         // This is an async method
         this.updatePropertiesFromClass();
      }
   }

   /** Update item properties based on FADE.WeaponMastery */
   async updatePropertiesFromClass() {
      const { classItem, levelData, title } = await this.getClass(this.name, this.system.level);
      if (!levelData) return; // Exit if no class level data is found for the given name
      let update = {};
      Object.assign(update, levelData);
      update.title = title;
      await this.update({ system: update });
   }

   async getClass(className, level) {
      // Replace hyphen with underscore for "Magic-User"
      const nameInput = className.toLowerCase();
      const classItem = await fadeFinder.getClass(nameInput);
      if (!classItem) {
         if (nameInput !== null && nameInput !== '') {
            console.warn(`Class not found ${this.system.details.class}.`);
         }
         return;
      }
      const levelData = classData.levels.find(level => level.level === currentLevel);
      const nameLevel = classData.levels.find(level => level.level === 9);
      let title = levelData.system.details.title;
      if (title == "" || title == null || title == prevLevelData?.title) {
         const ordinalized = Formatter.formatOrdinal(level);
         title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
      }
      return { classItem, levelData, title };
   }

   async getInlineDescription() {
      let description = null;
      if ((description?.length > 0) !== true) {
         description = '--';
      }
      return description;
   }
}