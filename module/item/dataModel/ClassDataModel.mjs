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
         firstLevel: new fields.NumberField({ required: true, initial: 1 }),
         maxLevel: new fields.NumberField({ required: true, initial: 0 }),
         maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),

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
            {
               required: true,
               initial: []
            }
         ),

         //levels: new fields.ArrayField(new fields.ObjectField(), { required: true }),
         levels: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               xp: new fields.NumberField({ required: true }),
               thac0: new fields.NumberField({ required: true }),
               thbonus: new fields.NumberField({ required: true }),
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
               initial: [new SavingThrowsData()]
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

         // Add other optional fields as needed, ensuring they are marked as required: false and nullable: true
      };
   }

   /** @override */
   prepareBaseData() {
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
         this.levels = [...newLevels];
      }
   }

   #prepareSpellLevels() {
      const totalLevelCount = this.maxLevel;
      const currentMaxSpellLevel = this.spells.length > 0 ? this.spells[0].length : 0;
      if (totalLevelCount !== this.spells.length || currentMaxSpellLevel !== this.maxSpellLevel) {
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