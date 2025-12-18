const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
/**
 * Field for storing Monster data.
 */
export class MonsterField extends EmbeddedDataField {
    constructor(options) {
        super(MonsterData, options);
    }
}
export class MonsterData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            details: new SchemaField({
                morale: new NumberField({ initial: 9 }),
                alignment: new StringField({ initial: "Chaotic" }),
                xpAward: new NumberField({ initial: 5 }),
                abilityCount: new NumberField({ initial: 0 }),
                monsterType: new StringField({ initial: "Monster" }),
                rarity: new StringField({ initial: "Common" }),
                saveAs: new StringField({ initial: "F1" }),
                // Some monsters have spells of a specific class level.
                castAs: new StringField({ initial: null, nullable: true }),
                // Some monsters have the class abilities of a specific class level.
                classAbilityAs: new StringField({ initial: null, nullable: true }),
                level: new NumberField({ initial: 1 })
            }),
            na: new SchemaField({
                wandering: new StringField({ initial: "1d6" }),
                lair: new StringField({ initial: "" }),
            }),
            treasure: new StringField({ initial: "" })
        };
    }
}
