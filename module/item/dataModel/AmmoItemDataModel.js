import { IdentifiableData } from '../fields/IdentifiableField';
const { BooleanField, NumberField, SchemaField, ObjectField, StringField } = foundry.data.fields;
/**
 * Data model for an ammo item extending GearItemDataModel.
 */
export class AmmoItemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Extend the schema from IdentifiableData
            ...IdentifiableData.defineSchema(),
            // Some item types use short name, like the saving throw.
            shortName: new StringField({ required: false, initial: "" }),
            description: new StringField({ required: false, initial: "" }),
            gm: new SchemaField({
                notes: new StringField({ required: false, initial: "" })
            }),
            // Some items can be used multiple times and it doesn't effect the total weight or cost
            charges: new NumberField({ required: true, initial: 0 }),
            chargesMax: new NumberField({ required: false, initial: 0, nullable: true }),
            // Fields from the "physical" template
            quantity: new NumberField({ required: true, initial: 1 }),
            quantityMax: new NumberField({ required: false, initial: 0, nullable: true }),
            weight: new NumberField({ required: false, initial: 1 }),
            weightEquipped: new NumberField({ required: false, initial: null }),
            cost: new NumberField({ required: false, initial: 0 }),
            totalWeight: new NumberField({ required: false, initial: 0 }),
            totalCost: new NumberField({ required: false, initial: 0 }),
            containerId: new StringField({ required: false, initial: "" }),
            // Fields from the "equippable" template
            equipped: new BooleanField({ required: false, initial: false }),
            // Additional properties specific to the "item" type
            equippable: new BooleanField({ required: false, initial: true }),
            ammoType: new StringField({ required: false, initial: "arrow" }),
            isDropped: new BooleanField({ required: true, initial: false }),
            // Items with associated actions
            savingThrow: new StringField({ nullable: true, initial: null }),
            healFormula: new StringField({ nullable: true, initial: null }),
            damageType: new StringField({ required: false, initial: "" }),
            isAmmo: new BooleanField({ required: false, initial: true }),
            mod: new SchemaField({
                dmgRanged: new NumberField({ initial: 0 }),
                toHitRanged: new NumberField({ initial: 0 }),
                rangeMultiplier: new NumberField({ initial: 1 }),
                vsGroup: new ObjectField({}),
            })
        };
    }
    /** @override */
    prepareBaseData() {
        this.equippable = true;
        this.isAmmo = true;
        super.prepareBaseData();
    }
}
