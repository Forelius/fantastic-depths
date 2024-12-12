class ClassLevelData {
   constructor() {
      this.level = 1;
      this.xp = 0;
      this.thac0 = 20;
      this.thbonus = 1;
     this.hd = '1d8';
      this.hdcon = true;
      this.title = null;
      this.femaleTitle = null;
      this.attackRank = null;      
   }
}

export class SavingThrowsData {
   constructor() {
      this.level = 1;
      this.death = 15;
      this.wand = 15;
      this.paralysis = 15;
      this.breath = 15;
      this.spell = 15;
   }
}

export class ClassDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         name: new fields.StringField({ required: true }),
         species: new fields.StringField({ required: true, initial: "Human" }),
         maxLevel: new fields.NumberField({ required: true, initial: 14 }),
         maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),
         isSpellcaster: new fields.BooleanField({ required: true, initial: false }),
         hasLevelZero: new fields.BooleanField({ required: false, initial: false }),

         // Optional Fields
         alignment: new fields.StringField({ required: false, nullable: true, initial: "Any" }),
         minCon: new fields.NumberField({ required: false, nullable: true }),
         minInt: new fields.NumberField({ required: false, nullable: true }),
         minDex: new fields.NumberField({ required: false, nullable: true }),
         minWis: new fields.NumberField({ required: false, nullable: true }),

         primeReqs: new fields.ArrayField(
            new fields.SchemaField({
               ability: new fields.StringField({ required: true }),
               xpBonus5: new fields.NumberField({ required: true }),
               xpBonus10: new fields.NumberField({ required: true }),
            }),
            { required: true }
         ),

         //levels: new fields.ArrayField(new fields.ObjectField(), { required: true }),
         levels: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               xp: new fields.NumberField({ required: true, initial: 0 }),
               thac0: new fields.NumberField({ required: true }),
               thbonus: new fields.NumberField({ required: true }),
               hd: new fields.StringField({ required: true, initial: '1d8' }),
               hdcon: new fields.BooleanField({ required: true, initial: true }),
               title: new fields.StringField({ required: false, nullable: true }),
               femaleTitle: new fields.StringField({ required: false, nullable: true }),
               attackRank: new fields.StringField({ required: false, nullable: true }),
            }),
            {
               required: true,
               initial: Array.from({ length: 14 }, (_, index) => {
                  const newLevel = new ClassLevelData();
                  newLevel.hd = `${(index+1)}d8`;
                  newLevel.level = index + 1;
                  newLevel.thac0 = 19;
                  return newLevel;
               })
            }
         ),

         saves: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               death: new fields.NumberField({ required: true }),
               wand: new fields.NumberField({ required: true }),
               paralysis: new fields.NumberField({ required: true }),
               breath: new fields.NumberField({ required: true }),
               spell: new fields.NumberField({ required: true }),
            }),
            {
               required: true,
               initial: ()=> new SavingThrowsData()
            }
         ),

         // Spells Field Adjusted to Be Optional
         spells: new fields.ArrayField(
            new fields.ArrayField(new fields.NumberField({ required: true })),
            { required: false, nullable: true }
         ),

         // Add other optional fields as needed, ensuring they are marked as required: false and nullable: true
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.#prepareLevels();
   }

   #prepareLevels() {
      const missingLevels = this.maxLevel - this.levels.length;
      if (this.maxLevel > this.levels.length) {
         const newLevels = Array.from({ length: missingLevels }, (_, index) => {
            const newLevel = new ClassLevelData();
            newLevel.level = index + this.levels.length + 1;
            return newLevel;
         });
         // Combine the original levels with the new items
         this.levels = [...this.levels, ...newLevels];
      } else if (this.maxLevel < this.levels.length) {
         // Remove unwanted levels. Yes, they are unwanted and unloved.
         this.levels = this.levels.slice(0, this.maxLevel);
      } else {
      }
   }

   /**
   * Synchronize `levels` and `spells` with the current maxLevel and maxSpellLevel.
   * @param {number} maxLevel - The maximum level.
   * @param {number} maxSpellLevel - The maximum spell level.
   * @private
   */
   async #synchronizeLevelsAndSpells(maxLevel, maxSpellLevel) {
      // Deep clone the existing levels and spells to work with them safely
      let levels = foundry.utils.deepClone(this.item.system.levels) || [];
      let spells = foundry.utils.deepClone(this.item.system.spells) || [];

      // Adjust levels array to match maxLevel
      if (levels.length < maxLevel) {
         for (let i = levels.length; i < maxLevel; i++) {
            levels.push({
               level: i + 1,
               xp: 0,
               thac0: 20,
               hd: "1d8",
               hdcon: false,
               title: "",
               femaleTitle: "",
               attackRank: ""
            });
         }
      } else if (levels.length > maxLevel) {
         levels = levels.slice(0, maxLevel);
      }

      // Create a new array for spells to ensure reactivity
      let newSpells = [];

      // Adjust spells array to match maxLevel and maxSpellLevel
      for (let i = 0; i < maxLevel; i++) {
         if (i < spells.length) {
            // Adjust the existing spell level array
            let spellLevels = spells[i];
            if (spellLevels.length < maxSpellLevel) {
               spellLevels = spellLevels.concat(Array(maxSpellLevel - spellLevels.length).fill(0));
            } else if (spellLevels.length > maxSpellLevel) {
               spellLevels = spellLevels.slice(0, maxSpellLevel);
            }
            newSpells.push(spellLevels);
         } else {
            // Add new spell levels with all zeros if beyond the existing spells length
            newSpells.push(Array(maxSpellLevel).fill(0));
         }
      }

      // Update the item with new levels and spells
      await this.item.update({
         "system.levels": levels,
         "system.spells": newSpells,
         "system.maxLevel": maxLevel,
         "system.maxSpellLevel": maxSpellLevel
      });
      await this.render(true);
   }
}