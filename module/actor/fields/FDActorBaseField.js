const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
/**
 * Field for storing FDActorBase data.
 */
export class FDActorBaseField extends EmbeddedDataField {
    constructor(options) {
        super(FDActorBaseData, options);
    }
}
export class FDActorBaseData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
            biography: new StringField({ initial: "" }),
            details: new SchemaField({
                weight: new StringField({ initial: "" }),
                size: new StringField({ initial: "M" }),
            }),
            gm: new SchemaField({
                notes: new StringField({ initial: "", gmOnly: true }),
            }),
            activeLight: new StringField({ nullable: true, required: false, initial: null }),
            hp: new SchemaField({
                hd: new StringField({ initial: "1d8" }),
                value: new NumberField({ initial: 5 }),
                max: new NumberField({ initial: 5 }),
            }),
            movement: new SchemaField({
                turn: new NumberField({ nullable: true, initial: 120 }),
                max: new NumberField({ nullable: true, initial: 120 }),
                round: new NumberField({ nullable: true, initial: null }),
                day: new NumberField({ nullable: true, initial: null }),
                run: new NumberField({ nullable: true, initial: null }),
            }),
            movement2: new SchemaField({
                turn: new NumberField({ initial: 0 }),
                max: new NumberField({ initial: 0 }),
                round: new NumberField({ nullable: true, initial: null }),
                day: new NumberField({ nullable: true, initial: null }),
                run: new NumberField({ nullable: true, initial: null }),
            }),
            encumbrance: new SchemaField({
                value: new NumberField({ initial: 0 }),
                max: new NumberField({ initial: CONFIG.FADE.Encumbrance.Expert.maxLoad }),
                mv: new NumberField({ nullable: true, initial: null }),
                mv2: new NumberField({ nullable: true, initial: null }),
                label: new StringField(),
                desc: new StringField(),
            }),
            acDigest: new ArrayField(new StringField(), { required: false, initial: [] }),
            ac: new SchemaField({
                naked: new NumberField({ initial: CONFIG.FADE.Armor.acNaked }),
                nakedRanged: new NumberField({ initial: CONFIG.FADE.Armor.acNaked }),
                nakedAAC: new NumberField({ initial: CONFIG.FADE.Armor.acNakedAAC }),
                nakedRangedAAC: new NumberField({ initial: CONFIG.FADE.Armor.acNakedAAC }),
                // This is the raw AC based on armor and no modifiers applied. Used for wrestling.
                value: new NumberField({ initial: CONFIG.FADE.Armor.acNaked }),
                // For melee attacks
                total: new NumberField({ initial: CONFIG.FADE.Armor.acNaked }),
                // For ranged attacks
                totalRanged: new NumberField({ initial: CONFIG.FADE.Armor.acNaked }),
                // Same for ascending armor class
                totalAAC: new NumberField({ initial: CONFIG.FADE.Armor.acNakedAAC }),
                totalRangedAAC: new NumberField({ initial: CONFIG.FADE.Armor.acNakedAAC }),
                // AV is armor value and represents how many points of damage armor stops.
                // Assumes one AV for all body parts.
                av: new StringField({ initial: "0" }),
                shield: new NumberField({ initial: 0 }),
                // mod is an accumulator for armor AC mods only. All other items that modify armor must do so via actor's system.mod.ac.
                mod: new NumberField({ initial: 0 })
            }),
            // Stores one or more values from FADE.ActorGroups.
            actorGroups: new ArrayField(new StringField(), { required: false, initial: [] }),
        };
    }
}
