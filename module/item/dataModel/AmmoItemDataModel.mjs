/**
 * Data model for an ammo item extending GearItemDataModel.
 */
export class AmmoItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Some item types use short name, like the saving throw.
         shortName: new fields.StringField({ required: false, initial: "" }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         // Fields from the "physical" template
         quantity: new fields.NumberField({ required: true, initial: 1 }),
         quantityMax: new fields.NumberField({ required: false, initial: 0, nullable: true }),
         weight: new fields.NumberField({ required: false, initial: 1 }),
         weightEquipped: new fields.NumberField({ required: false, initial: null }),
         cost: new fields.NumberField({ required: false, initial: 0 }),
         totalWeight: new fields.NumberField({ required: false, initial: 0 }),
         totalCost: new fields.NumberField({ required: false, initial: 0 }),
         containerId: new fields.StringField({ required: false, initial: "" }),
         // Fields from the "equippable" template
         equipped: new fields.BooleanField({ required: false, initial: false }),
         // Additional properties specific to the "item" type
         equippable: new fields.BooleanField({ required: false, initial: false }),
         ammoType: new fields.StringField({ required: false, initial: "arrow" }),
         unidentifiedName: new fields.StringField({ required: false, initial: "" }),
         unidentifiedDesc: new fields.StringField({ required: false, initial: "" }),
         isIdentified: new fields.BooleanField({ required: false, initial: true }),
         isCursed: new fields.BooleanField({ required: false, initial: false }),
         isDropped: new fields.BooleanField({ required: true, initial: false }),
         // Items with associated actions
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         healFormula: new fields.StringField({ nullable: true, initial: null }),
         damageType: new fields.StringField({ required: false, initial: "" }),
         isAmmo: new fields.BooleanField({ required: false, initial: true }),
         mod: new fields.SchemaField({
            dmgRanged: new fields.NumberField({ initial: 0 }),
            toHitRanged: new fields.NumberField({ initial: 0 }),
            vsGroup: new fields.ObjectField({}),
         })
      };
   }

   /** @override */
   prepareBaseData() {
      this.equippable = true;
      this.isAmmo = true;
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}