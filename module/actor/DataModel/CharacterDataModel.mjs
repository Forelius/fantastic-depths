import { fadeActorDataModel } from "./fadeActorDataModel.mjs";
import { ClassItem } from "../../item/ClassItem.mjs";
import Formatter from '../../utils/Formatter.mjs';

export class CharacterDataModel extends fadeActorDataModel {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema,
         details: new foundry.data.fields.SchemaField({
            morale: new foundry.data.fields.NumberField({ initial: 9 }),
            alignment: new foundry.data.fields.StringField({ initial: "Neutral" }),
            level: new foundry.data.fields.NumberField({ initial: 0 }),
            xp: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
               bonus: new foundry.data.fields.NumberField({ initial: 0 }),
               next: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            class: new foundry.data.fields.StringField({ initial: "Fighter" }),
            species: new foundry.data.fields.StringField({ initial: "Human" }),
            title: new foundry.data.fields.StringField({ initial: "" }),
            age: new foundry.data.fields.NumberField({ initial: 20 }),
            sex: new foundry.data.fields.StringField({ initial: "Male" }),
            height: new foundry.data.fields.StringField({ initial: "6" }),
            weight: new foundry.data.fields.StringField({ initial: "170 lbs." }),
            eyes: new foundry.data.fields.StringField({ initial: "Blue" }),
            hair: new foundry.data.fields.StringField({ initial: "Brown" }),
         }),
         abilities: new foundry.data.fields.SchemaField({
            str: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            int: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            wis: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            dex: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            con: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            cha: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 10 }),
               mod: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
         }),
         exploration: new foundry.data.fields.SchemaField({
            openDoor: new foundry.data.fields.NumberField({ initial: 2 }),
            secretDoor: new foundry.data.fields.NumberField({ initial: 1 }),
            listenDoor: new foundry.data.fields.NumberField({ initial: 2 }),
            findTrap: new foundry.data.fields.NumberField({ initial: 1 }),
         }),
         retainer: new foundry.data.fields.SchemaField({
            max: new foundry.data.fields.NumberField({ initial: 0 }),
            morale: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         wrestling: new foundry.data.fields.NumberField({ initial: 0 }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.encumbrance.max = this.encumbrance.max || CONFIG.FADE.Encumbrance.maxLoad;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareDerivedAbilities();
      this._prepareWrestling();
      this._prepareClassInfo();
   }

   _prepareDerivedAbilities() {
      // Initialize abilities if missing
      const abilityTypes = ["str", "int", "wis", "dex", "con", "cha"];
      const adjustments = CONFIG.FADE.AdjustmentTableDD;
      for (let [key, ability] of Object.entries(this.abilities)) {
         let adjustment = adjustments.find(item => ability.value <= item.max);
         ability.mod = adjustment ? adjustment.value : adjustments[0].value;
      }

      // Retainer
      let charisma = this.abilities.cha.value;
      let adjustment = adjustments.find(item => charisma <= item.max);
      this.retainer.max = adjustment.maxRetainers;
      this.retainer.morale = adjustment.retainerMorale;
      // Safe to override because no rules or classes change this.
      this.exploration.openDoor = Math.min(5 - this.abilities.str.mod, 6);
   }

   _prepareWrestling() {
      // Wrestling skill
      this.wrestling = Math.ceil(this.details.level / 2) + this.ac.value;
      this.wrestling += this.abilities.str.mod + this.abilities.dex.mod;
   }

   /**
    * Prepares all derived class-related data when the class name is recognized.
    * @returns
    */
   _prepareClassInfo() {
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = this.details.class?.toLowerCase();
      const classLevel = this.details.level;

      const classItem = ClassItem.getClassItem(classNameInput);
      const classData = classItem?.system;

      if (classData) {
         const currentLevel = classLevel;
         const levelData = classData.levels.find(level => level.level === currentLevel);
         const nextLevelData = classData.levels.find(level => level.level === currentLevel + 1);
         const nameLevel = classData.levels.find(level => level.level === 9);

         // Level Bonus
         const { pr5Count, pr10Count } = classData.primeReqs.reduce((counts, primeReq) => {
            const value = this.abilities[primeReq.ability].value;
            if (value >= primeReq.xpBonus5) counts.pr5Count++;
            if (value >= primeReq.xpBonus10) counts.pr10Count++;
            return counts;
         }, { pr5Count: 0, pr10Count: 0 });
         this.details.xp.bonus = pr10Count === classData.primeReqs.length ? 10 : pr5Count === classData.primeReqs.length ? 5 : 0;

         // Level stuff
         if (levelData) {
            this.hp.hd = levelData.hd;
            this.thac0.value = levelData.thac0;

            if (this.details.title == "" || this.details.title == null) {
               let ordinalized = Formatter.formatOrdinal(currentLevel);
               this.details.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
            }
         }
         if (nextLevelData) {
            this.details.xp.next = nextLevelData.xp;
         }
         this.details.species = classData.species;
         this.config.maxSpellLevel = classData.maxSpellLevel;

         // Spells
         const classSpellsIdx = this.details.level - 1;
         if (classData.spells && classSpellsIdx < classData.spells.length) {
            // Get the spell progression for the given character level
            const spellProgression = classData.spells[classSpellsIdx];

            // Loop through the spell slots in the this and update the 'max' values
            this.spellSlots.forEach((slot, index) => {
               // Check if the index is within the spellProgression array bounds
               if (index - 1 >= 0 && index - 1 < spellProgression.length) {
                  // Set the max value based on the class spell progression
                  slot.max = spellProgression[index - 1];
               } else {
                  // Set max to 0 if the character's class doesn't have spells at this level
                  slot.max = 0;
               }
            });
         }

         // Saving throws
         const savesData = ClassItem.getClassSaves(classNameInput, currentLevel);
         if (savesData) {
            super._prepareSavingThrows(savesData);
         }
         // Apply modifier for wisdom, if needed
         this.savingThrows.spell.value -= this.abilities.wis.mod;
      }

      return classData; // Return null if no match found
   }
}
