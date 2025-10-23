const { ArrayField, BooleanField, ObjectField, NumberField, SchemaField, StringField } = foundry.data.fields;

export class ClassLevelData {
   constructor(options = {}) {
      this.level = options?.level ?? 1;
      this.xp = 0;
      this.thac0 = CONFIG.FADE.ToHit.baseTHAC0;
      this.thbonus = 1;
      this.hd = "";
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
      return {
         // Required Fields
         // The class key
         key: new StringField({ required: true }),
         species: new StringField({ required: true, initial: "Human" }),
         firstLevel: new NumberField({ required: true, initial: 1 }),
         maxLevel: new NumberField({ required: true, initial: 0 }),
         firstSpellLevel: new NumberField({ required: true, initial: 1 }),
         maxSpellLevel: new NumberField({ required: true, initial: 0 }),
         // If true the character or class has basic proficiency with all weapons.
         basicProficiency: new BooleanField({ required: true, initial: false }),
         unskilledToHitMod: new NumberField({ required: true, initial: -2 }),
         // Optional Fields
         alignment: new StringField({ required: false, nullable: true, initial: "Any" }),
         description: new StringField({ required: false, initial: "" }),
         // Only the class key, not the level like monster does for castAs
         castAsKey: new StringField({ nullable: true, required: false, initial: null }),
         // Ability scores
         abilities: new SchemaField({
            str: new SchemaField({
               min: new NumberField({ nullable: true }),
            }),
            int: new SchemaField({
               min: new NumberField({ nullable: true }),
            }),
            wis: new SchemaField({
               min: new NumberField({ nullable: true }),
            }),
            dex: new SchemaField({
               min: new NumberField({ nullable: true }),
            }),
            con: new SchemaField({
               min: new NumberField({ nullable: true }),
            }),
            cha: new SchemaField({
               min: new NumberField({ nullable: true }),
            })
         }),
         primeReqs: new ArrayField(
            new SchemaField({
               concatLogic: new StringField({ required: true }),
               ability: new StringField({ required: true }),
               percentage: new NumberField({ required: true, initial: 5 }),
               minScore: new NumberField({ required: true }),
               xpBonus5: new NumberField({ required: true }),
               xpBonus10: new NumberField({ required: true }),
            }),
            {
               required: true,
               initial: []
            }
         ),
         levels: new ArrayField(
            new SchemaField({
               level: new NumberField({ required: true, initial: 1}),
               xp: new NumberField({ required: true, initial: 0 }),
               thac0: new NumberField({ required: true, initial: CONFIG.FADE.ToHit.baseTHAC0 }),
               thbonus: new NumberField({ required: true, initial: 0 }),
               hd: new StringField({ required: true, initial: "" }),
               hdcon: new BooleanField({ required: true, initial: true }),
               title: new StringField({ required: false, nullable: true }),
               femaleTitle: new StringField({ required: false, nullable: true }),
               attackRank: new StringField({ required: false, nullable: true }),
            }),
            {
               required: true,
               initial: Array.from({ length: this.maxLevel }, (_, index) => {
                  return new ClassLevelData({ level: index + this.firstLevel });
               })
            }
         ),
         saves: new ArrayField(
            new ObjectField({}),
            {
               required: true,
               initial: []
            }
         ),
         // Spells Field Adjusted to Be Optional
         spells: new ArrayField(
            new ArrayField(
               new NumberField({ required: true, initial: 0 })
            ),
            {
               required: false,
               nullable: false,
               initial: Array.from({ length: this.maxLevel }, () => Array.from({ length: (this.maxSpellLevel + 1) - this.firstSpellLevel }))
            }
         ),
         specialAbilities: new ArrayField(
            new SchemaField({
               name: new StringField({ required: true, initial: "" }),
               level: new NumberField({ required: true }),
               target: new NumberField({ required: true, nullable: true }),
               classKey: new StringField({ nullable: true, initial: null }),
               changes: new StringField({ required: true, initial: "" }),
            }),
            {
               required: false,
               initial: []
            }),
         classItems: new ArrayField(
            new SchemaField({
               level: new NumberField({ required: true, nullable: false }),
               name: new StringField({ required: true, initial: "" }),
               type: new StringField({ required: true, initial: "" }),
               changes: new StringField({ required: true, initial: "" }),
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
      //const currentVersion = new MySystemVersion(source.version ?? "0.10.0-rc.5");
      if ((!source.specialAbilities || source.specialAbilities.length == 0) && source.classAbilities?.length > 0) {
         source.specialAbilities = source.classAbilities;
      }
      return super.migrateData(source);
   }

   /** @override */
   prepareBaseData() {
      this.firstLevel = Math.max(0, (this.firstLevel ?? 1));
      this.maxLevel = Math.max(this.firstLevel, (this.maxLevel ?? this.firstLevel));
      super.prepareBaseData();
   }

   #prepareLevels() {
      const totalLevelCount = this.maxLevel - (this.firstLevel - 1);
      if (totalLevelCount !== this.levels.length) {
         const newLevels = Array.from({ length: totalLevelCount }, (_, index) => {
            return new ClassLevelData({ level: index + this.firstLevel });
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
      if ((this.maxSpellLevel > 0) === false) {
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