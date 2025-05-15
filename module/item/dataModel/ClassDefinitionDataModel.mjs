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
   }
}

export class ClassDefinitionDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         key: new fields.StringField({ required: true }),
         species: new fields.StringField({ required: true, initial: "Human" }),
         firstLevel: new fields.NumberField({ required: true, initial: 1 }),
         maxLevel: new fields.NumberField({ required: true, initial: 0 }),
         maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),
         // Instead of looking at actor type, use this field to determine if actor requires mastery for basic proficiency.
         requiresMastery: new fields.BooleanField({ required: true, initial: true }),

         // Optional Fields
         alignment: new fields.StringField({ required: false, nullable: true, initial: "Any" }),
         description: new fields.StringField({ required: false, initial: "" }),
         // Ability scores
         abilities: new fields.SchemaField({
            str: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            }),
            int: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            }),
            wis: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            }),
            dex: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            }),
            con: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            }),
            cha: new fields.SchemaField({
               min: new fields.NumberField({ nullable: true }),
            })
         }),
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
               thac0: new fields.NumberField({ required: true, initial: CONFIG.FADE.ToHit.BaseTHAC0 }),
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
                  newLevel.level = index + this.firstLevel;
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
         specialAbilities: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               level: new fields.NumberField({ required: true }),
               target: new fields.NumberField({ required: true, nullable: true }),
               classKey: new fields.StringField({ nullable: true, initial: null }),
               changes: new fields.StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            }),
         classItems: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true, nullable: false }),
               name: new fields.StringField({ required: true, initial: '' }),
               type: new fields.StringField({ required: true, initial: '' }),
               changes: new fields.StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            }),
      };
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      //const currentVersion = new MySystemVersion(source.version ?? '0.10.0-rc.5');
      if ((!source.specialAbilities || source.specialAbilities.length == 0) && source.classAbilities?.length > 0) {
         source.specialAbilities = source.classAbilities;
      }
      return super.migrateData(source);
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
               if (newLevels[i].level === this.levels[i].level) {
                  newLevels[i] = this.levels[i];
               }
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