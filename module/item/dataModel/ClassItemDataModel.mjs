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
      // Create the saving throw member variables dynamically from the world's save items.
      const saves = game.items?.filter(item => item.type === 'specialAbility' && item.system.category === 'save')
         .map(item => item.system.customSaveCode);
      for (let save of saves) {
         this[save] = 15;
      }
   }
}

export class ClassItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         key: new fields.StringField({ required: true }),
         species: new fields.StringField({ required: true, initial: "Human" }),
         firstLevel: new fields.NumberField({ required: true, initial: 1 }),
         maxLevel: new fields.NumberField({ required: true, initial: 0 }),
         maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),

         // Optional Fields
         alignment: new fields.StringField({ required: false, nullable: true, initial: "Any" }),
         minCon: new fields.NumberField({ required: false, nullable: true }),
         minInt: new fields.NumberField({ required: false, nullable: true }),
         minDex: new fields.NumberField({ required: false, nullable: true }),
         minWis: new fields.NumberField({ required: false, nullable: true }),
         description: new fields.StringField({ required: false, initial: "" }),
         primeReqs: new fields.ArrayField(
            new fields.SchemaField({
               concatLogic: new fields.StringField({ required: true }),
               ability: new fields.StringField({ required: true }),
               percentage: new fields.NumberField({ required: true, initial: 5 }),
               minScore: new fields.NumberField({ required: true }),
               xpBonus5: new fields.NumberField({ required: true }),
               xpBonus10: new fields.NumberField({ required: true }),
            }),
            {
               required: true,
               initial: []
            }
         ),
         levels: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               xp: new fields.NumberField({ required: true, initial: 5 }),
               thac0: new fields.NumberField({ required: true, initial: 19 }),
               thbonus: new fields.NumberField({ required: true, initial: 0 }),
               hd: new fields.StringField({ required: true, initial: '' }),
               hdcon: new fields.BooleanField({ required: true, initial: true }),
               title: new fields.StringField({ required: false, nullable: true }),
               femaleTitle: new fields.StringField({ required: false, nullable: true }),
               attackRank: new fields.StringField({ required: false, nullable: true }),
            }),
            {
               required: true,
               initial: Array.from({ length: this.maxLevel }, (_, index) => {
                  const newLevel = new ClassLevelData();
                  newLevel.level = index + 1;
                  return newLevel;
               })
            }
         ),

         saves: new fields.ArrayField(
            new fields.ObjectField({}),           
            {
               required: true,
               initial: []
            }
         ),

         // Spells Field Adjusted to Be Optional
         spells: new fields.ArrayField(
            new fields.ArrayField(
               new fields.NumberField({ required: true, initial: 0 })
            ),
            {
               required: false,
               nullable: false,
               initial: Array.from({ length: this.maxLevel }, () => Array.from({ length: this.maxSpellLevel }))
            }
         ),
         classAbilities: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               level: new fields.NumberField({ required: true }),
               target: new fields.NumberField({ required: true, nullable: true }),
            }), {
            required: false,
         })
      };
   }

   /** @override */
   prepareBaseData() {
      this.maxSpellLevel = Math.max(0, (this.maxSpellLevel ?? 0));
      this.firstLevel = Math.max(0, (this.firstLevel ?? 1));
      this.maxLevel = Math.max(this.firstLevel, (this.maxLevel ?? this.firstLevel));
      super.prepareBaseData();
      this.#prepareLevels();
      this.#prepareSpellLevels();
   }

   #prepareLevels() {
      const totalLevelCount = this.maxLevel - (this.firstLevel - 1);
      if (totalLevelCount !== this.levels.length) {
         const newLevels = Array.from({ length: totalLevelCount }, (_, index) => {
            const newLevel = new ClassLevelData();
            newLevel.level = index + this.firstLevel;
            return newLevel;
         });

         // Try to preserve existing levels
         if (this.levels && this.levels.length > 0) {
            for (let i = 0; i < this.levels.length && i < newLevels.length; i++) {
               newLevels[i] = this.levels[i];
            }
         }
         this.levels = [...newLevels];
      } else {
         // Make sure level numbers are correct.
         for (let i = 0; i < totalLevelCount; i++) {
            if (this.levels[i].level === null) {
               this.levels[i].level = i + this.firstLevel;
            }
         }
      }
   }

   #prepareSpellLevels() {
      const totalLevelCount = this.maxLevel;
      const currentMaxSpellLevel = this.spells.length > 0 ? this.spells[0].length : 0;
      if (this.maxSpellLevel <= 0) {
         this.spells = [];
      } else if (totalLevelCount !== this.spells.length || currentMaxSpellLevel !== this.maxSpellLevel) {
         const newLevels = Array.from({ length: totalLevelCount }, () => Array.from({ length: this.maxSpellLevel }, () => 0));
         // Try to preserve existing spells
         if (this.spells && this.spells.length > 0) {
            for (let i = 0; i < this.spells.length && i < newLevels.length; i++) {
               let oldLevel = this.spells[i];
               let newLevel = newLevels[i];
               for (let j = 0; j < oldLevel.length && j < newLevel.length; j++) {
                  newLevels[i][j] = oldLevel[j];
               }
            }
         }
         this.spells = [...newLevels];
      }
   }
}