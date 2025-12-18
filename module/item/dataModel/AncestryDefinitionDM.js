const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
export class AncestryDefinitionDM extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const schema = {
            // Required Fields
            key: new StringField({ required: true }),
            description: new StringField({ required: false, initial: "" }),
            languages: new ArrayField(new StringField({ required: false }), { initial: [] }),
            baseMovement: new NumberField({ required: true }),
            heightFormulaM: new StringField({ nullable: true }),
            weightFormulaM: new StringField({ nullable: true }),
            heightFormulaF: new StringField({ nullable: true }),
            weightFormulaF: new StringField({ nullable: true }),
            ageFormula: new StringField({ nullable: true }),
            // If true the character or class has basic proficiency with all weapons.
            basicProficiency: new BooleanField({ required: true, initial: false }),
            classes: new ArrayField(new SchemaField({
                name: new StringField({ required: true, initial: '' }),
                maxLevel: new NumberField({ required: true })
            }), {
                required: false,
            }),
            // Special abilities
            specialAbilities: new ArrayField(new SchemaField({
                name: new StringField({ required: true, initial: '' }),
                uuid: new StringField({ required: true, initial: "" }),
                classKey: new StringField({ nullable: true }),
                target: new StringField({ nullable: true, initial: null }),
                changes: new StringField({ required: true, initial: '' })
            }), {
                required: false,
            }),
            ancestryItems: new ArrayField(new SchemaField({
                level: new NumberField({ required: true, nullable: false }),
                name: new StringField({ required: true, initial: '' }),
                type: new StringField({ required: true, initial: '' }),
                changes: new StringField({ required: false, initial: '' }),
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
}
