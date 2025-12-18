import { IdentifiableData } from '../fields/IdentifiableField.js';
const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class GearItemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Extend the schema from IdentifiableData
            ...IdentifiableData.defineSchema(),
            // Some item types use short name, like the saving throw.
            shortName: new StringField({ required: false, initial: "" }),
            // Fields from the "base" template
            tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
            description: new StringField({ required: false, initial: "" }),
            gm: new SchemaField({
                notes: new StringField({ required: false, initial: "" })
            }),
            // Fields from the "physical" template
            quantity: new NumberField({ required: true, initial: 1 }),
            quantityMax: new NumberField({ required: false, initial: 0, nullable: true }),
            // Some items can be used multiple times and it doesn't effect the total weight or cost
            charges: new NumberField({ required: true, initial: 0 }),
            chargesMax: new NumberField({ required: false, initial: 0, nullable: true }),
            weight: new NumberField({ required: false, initial: 1 }),
            weightEquipped: new NumberField({ required: false, initial: null }),
            cost: new NumberField({ required: false, initial: 0 }),
            totalWeight: new NumberField({ required: false, initial: 0 }),
            totalCost: new NumberField({ required: false, initial: 0 }),
            containerId: new StringField({ required: false, initial: "" }),
            // Fields from the "equippable" template
            equipped: new BooleanField({ required: false, initial: false }),
            // Additional properties specific to the "item" type
            container: new BooleanField({ required: false, initial: false }),
            isOpen: new BooleanField({ required: false, initial: false }),
            equippable: new BooleanField({ required: false, initial: false }),
            // Indicates why type of fuel this item is, if any.
            fuelType: new StringField({ required: false, initial: "" }),
            isDropped: new BooleanField({ required: true, initial: false }),
            // Items with associated actions
            // Is the item considered to be treasure when calculating encumbrance.
            // Yes, even though not item.type='treasure'.
            isTreasure: new BooleanField({ required: true, initial: false }),
            specialAbilities: new ArrayField(new SchemaField({
                action: new StringField({ required: false, nullable: true }),
                uuid: new StringField({ required: true, initial: "" }),
                name: new StringField({ required: true, initial: "" }),
                // Roll mod
                mod: new NumberField({ required: true, nullable: true }),
            }), {
                required: false,
                initial: []
            }),
            spells: new ArrayField(new SchemaField({
                action: new StringField({ required: false, nullable: true }),
                // The class and level the spell is cast as.
                castAs: new StringField({ required: true, initial: "" }),
                uuid: new StringField({ required: true, initial: "" }),
                name: new StringField({ required: true, initial: "" }),
            }), {
                required: false,
                initial: []
            }),
            conditions: new ArrayField(new SchemaField({
                name: new StringField({ required: true, initial: '' }),
                durationFormula: new StringField({ required: false, nullable: true, initial: null }),
                uuid: new StringField({ required: true, initial: '' }),
            }), {
                required: false,
                initial: []
            })
        };
    }
    /**
     * Migrate source data from some prior format into a new specification.
     * The source parameter is either original data retrieved from disk or provided by an update operation.
     * @inheritDoc
     */
    static migrateData(source) {
        // TODO: Remove someday.    
        if ((source.weightEquipped === null || source.weightEquipped === undefined) && source.weight) {
            //console.debug(`Setting equipped weight. Was ${source, source.weightEquipped} will be ${source.weight}`);
            source.weightEquipped = source.weight;
        }
        return super.migrateData(source);
    }
    prepareBaseData() {
        super.prepareBaseData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.weight === 0) {
            this.weightEquipped = 0;
        }
        // If the quantity is zero or this item is contained in a container...
        if (this.quantity === 0 || (this.containerId?.length > 0 && this.isAmmo == false)) {
            // It can't be equipped.
            this.equipped = false;
            // It can't be dropped.
            this.isDropped = false;
        }
        // If this is a container then do not allow quantity other than 1.
        if (this.container) {
            this.quantity = 1;
            this.quantityMax = 0;
        }
        if (this.chargesMax === null) {
            this.charges = 1;
        }
        else {
            this.charges = Math.min(this.charges, this.chargesMax);
        }
    }
}
