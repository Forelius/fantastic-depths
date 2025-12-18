const { ArrayField, BooleanField, ObjectField, NumberField, SchemaField, StringField } = foundry.data.fields;
export class ClassLevelData {
    level;
    xp;
    thac0;
    thbonus;
    hd;
    hdcon;
    title;
    femaleTitle;
    attackRank;
    constructor(options = { level: null }) {
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
    level;
    constructor() {
        this.level = 1;
    }
}
export class ClassDefinitionDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const schema = {
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
            primeReqs: new ArrayField(new SchemaField({
                concatLogic: new StringField({ required: true }),
                ability: new StringField({ required: true }),
                percentage: new NumberField({ required: true, initial: 5 }),
                minScore: new NumberField({ required: true }),
            }), {
                required: true,
                initial: []
            }),
            levels: new ArrayField(new SchemaField({
                level: new NumberField({ required: true, initial: 1 }),
                xp: new NumberField({ required: true, initial: 0 }),
                thac0: new NumberField({ required: true, initial: CONFIG.FADE.ToHit.baseTHAC0 }),
                thbonus: new NumberField({ required: true, initial: 0 }),
                hd: new StringField({ required: true, initial: "" }),
                hdcon: new BooleanField({ required: true, initial: true }),
                title: new StringField({ required: false, nullable: true }),
                femaleTitle: new StringField({ required: false, nullable: true }),
                attackRank: new StringField({ required: false, nullable: true }),
            }), {
                required: true,
                initial: Array.from({ length: this.maxLevel }, (_, index) => {
                    return new ClassLevelData({ level: index + this.firstLevel });
                })
            }),
            saves: new ArrayField(new ObjectField({}), {
                required: true,
                initial: []
            }),
            // Spells Field Adjusted to Be Optional
            spells: new ArrayField(new ArrayField(new NumberField({ required: true, initial: 0 })), {
                required: false,
                nullable: false,
                initial: Array.from({ length: this.maxLevel }, () => Array.from({ length: (this.maxSpellLevel + 1) - this.firstSpellLevel }))
            }),
            specialAbilities: new ArrayField(new SchemaField({
                name: new StringField({ required: true, initial: "" }),
                uuid: new StringField({ required: true, initial: "" }),
                level: new NumberField({ required: true }),
                target: new NumberField({ required: true, nullable: true }),
                classKey: new StringField({ nullable: true, initial: null }),
                changes: new StringField({ required: true, initial: "" }),
            }), {
                required: false,
                initial: []
            }),
            classItems: new ArrayField(new SchemaField({
                level: new NumberField({ required: true, nullable: false }),
                name: new StringField({ required: true, initial: "" }),
                type: new StringField({ required: true, initial: "" }),
                changes: new StringField({ required: true, initial: "" }),
            }), {
                required: false,
                initial: []
            }),
            abilities: null
        };
        const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
        schema.abilities = abilityScoreSys.defineSchemaForClass();
        return schema;
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
    prepareBaseData() {
        this.firstLevel = Math.max(0, (this.firstLevel ?? 1));
        this.maxLevel = Math.max(this.firstLevel, (this.maxLevel ?? this.firstLevel));
        super.prepareBaseData();
        this.primeRegs = this.primeReqs.sort((a, b) => {
            let result = a.percentage - b.percentage;
            if (result === 0)
                result = a.minScore - b.minScore;
            if (result === 0)
                result = a.ability.localeCompare(b.ability);
            return result;
        });
    }
}
