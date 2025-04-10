// actor-character.mjs
import { fadeActor } from './fadeActor.mjs';
import { TagManager } from '../sys/TagManager.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { Wrestling } from "/systems/fantastic-depths/module/sys/combat/Wrestling.mjs";

export class MonsterActor extends fadeActor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareSavingThrows();
      this.system.wrestling = Wrestling.calculateWrestlingRating(this);
   }

   /**
    * Intercept updateActor method call to log changes.
    * @override
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async onUpdateActor(updateData, options, userId) {
      await super.onUpdateActor(updateData, options, userId);
      // If classAbilityAs updated...
      if (updateData.system?.details?.classAbilityAs?.length > 0) {
         const result = await fadeFinder.getClassAbilitiesByCode(this.system?.details?.classAbilityAs, this);
         if (result.classAbilityData) {
            await this._setupSpecialAbilities(result.classAbilityData);
         }
      }
      if (updateData.system?.details?.castAs?.length > 0) {
         await this._setupClassMagic();
      }
   }

   async _prepareSavingThrows() {
      if (this.id) {
         const saveAs = this.system.details.saveAs ?? null;
         if (saveAs) {
            const savesData = await fadeFinder.getClassSavesByCode(saveAs, this);
            if (savesData) {
               await this._setupSavingThrows(savesData);
            } else {
               console.warn(`Invalid save-as value ${saveAs} specified for ${this.name}.`);
            }
         }
      }
   }

   /**
    * Prepares class-related magic data when the class name is recognized.
    * @protected
    */
   async _setupClassMagic() {
      if (game.user.isGM === false || (this.system.details.castAs?.length ?? 0) === 0) return;
      const promises = [];
      const match = this.system.details.castAs?.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
      // This this actor's level to be same as cast-as.
      promises.push(this.update({ 'system.details.level': (parsed?.classLevel ?? 1) }));

      // Get the class item
      const classItem = await fadeFinder.getClass(null, parsed?.classId);
      if (!classItem) {
         console.warn(`Class not found for key ${this.system.name}. Cast As: ${this.system.details.castAs}.`);
         return;
      }
      const classData = classItem.system;
      // Set this actor's maxSpellLevel from class data.
      promises.push(this.update({ 'system.config.maxSpellLevel': classData.maxSpellLevel }));

      // Spells
      const classSpellsIdx = parsed.classLevel - 1;
      if (classData.spells?.length > 0 && classSpellsIdx < classData.spells.length) {
         // Get the spell progression for the given character level
         const spellProgression = classData.spells[classSpellsIdx];
         if (spellProgression === undefined || spellProgression === null || spellProgression.length === 0) {
            console.warn(`Class spells are empty for spellcaster ${this.system.name} (${parsed.classId}). Max spells per level cannot be set.`, classData.spells);
         } else {
            // Loop through the spell slots in the this and update the 'max' values
            const slots = [];
            for (let i = 0; i < this.system.spellSlots.length; i++) {
               let slot = {};
               Object.assign(slot, this.system.spellSlots[i]);
               slots.push(slot);
               const index = slot.spellLevel - 1;
               // Check if the index is within the spellProgression array bounds
               if (index >= 0 && index < spellProgression.length) {
                  // Set the max value based on the class spell progression
                  slot.max = spellProgression[index];
               } else {
                  // Set max to 0 if the character's class doesn't have spells at this level
                  slot.max = 0;
               }
            }
            console.log(`Updating ${this.name} spell slots.`, slots, this.system.spellSlots);
            promises.push(this.update({ 'system.spellSlots': slots }));
         }
      }
      // If there are any promises then await them.
      if (promises.length > 0) {
         await Promise.all(promises);
         console.log(`Updated ${this.name} magic abilities. Cast As: ${this.system.details.castAs}`, this.system.details.level, this.system.spellSlots);
      }
   }
}