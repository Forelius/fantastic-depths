const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
/**
 * Data model for a skill item.
 */
export class SkillItemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Fields from the "base" template
            description: new StringField({ required: false, initial: "" }),
            gm: new SchemaField({
                notes: new StringField({ required: false, initial: "" })
            }),
            // Fields specific to the "skill" template
            ability: new StringField({ required: true, initial: "str" }),
            targetFormula: new StringField({ required: true, initial: "@rollTarget" }),
            operator: new StringField({ required: true, initial: "lte" }),
            rollFormula: new StringField({ required: true, initial: "1d20" }),
            level: new NumberField({ required: true, initial: 1 }),
            rollMode: new StringField({ required: false, initial: "" }),
            healFormula: new StringField({ nullable: true, initial: null }),
            showResult: new BooleanField({ required: false, initial: true }),
            // Bonus to roll for having skill. Different than level bonus.
            skillBonus: new NumberField({ required: true, initial: 0 }),
            // Bonus to roll for not having skill. When level equals zero.
            skillPenalty: new NumberField({ required: true, initial: 0 }),
            autoSuccess: new NumberField({ required: false, initial: null, nullable: true }),
            autoFail: new NumberField({ required: false, initial: null, nullable: true }),
        };
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
    }
}
