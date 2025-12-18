const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
/**
 * Field for storing Identifiable data.
 */
export class IdentifiableField extends EmbeddedDataField {
    constructor(options) {
        super(IdentifiableData, options);
    }
}
export class IdentifiableData extends foundry.abstract.DataModel {
    /** @override */
    static defineSchema() {
        return {
            unidentifiedName: new StringField({ required: false, initial: "" }),
            unidentifiedDesc: new StringField({ required: false, initial: "" }),
            isIdentified: new BooleanField({ required: false, initial: true }),
            isCursed: new BooleanField({ required: false, initial: false })
        };
    }
}
