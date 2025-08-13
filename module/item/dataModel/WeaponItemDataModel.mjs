import { GearItemDataModel } from "./GearItemDataModel.mjs";

/**
 * Data model for a weapon item extending GearItemDataModel.
 */
export class WeaponItemDataModel extends GearItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from GearItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema,

         // Fields specific to the "weapon" template
         damageRoll: new fields.StringField({ required: true, initial: "1d6" }),
         damageLabel: new fields.StringField({ required: false, initial: "1d6" }),
         damageType: new fields.StringField({ required: true, initial: "physical" }),
         breath: new fields.StringField({ nullable: true, initial: null }),
         canMelee: new fields.BooleanField({ required: false, initial: true }),
         canRanged: new fields.BooleanField({ required: false, initial: false }),
         canSet: new fields.BooleanField({ required: false, initial: false }),
         isSlow: new fields.BooleanField({ required: false, initial: false }),
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         saveDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         mastery: new fields.StringField({ required: false, initial: "" }),
         weaponType: new fields.StringField({ required: false, initial: "" }),
         range: new fields.SchemaField({
            short: new fields.NumberField({ nullable: true, initial: null }),
            medium: new fields.NumberField({ nullable: true, initial: null }),
            long: new fields.NumberField({ nullable: true, initial: null })
         }),
         size: new fields.StringField({ required: false, nullable:true, initial: null }),
         grip: new fields.StringField({ required: false, nullable: true, initial: null }),
         natural: new fields.BooleanField({ required: false, initial: false }),
         mod: new fields.SchemaField({
            dmg: new fields.NumberField({ initial: 0 }),
            toHit: new fields.NumberField({ initial: 0 }),
            dmgRanged: new fields.NumberField({ initial: 0 }),
            toHitRanged: new fields.NumberField({ initial: 0 }),
            vsGroup: new fields.ObjectField({}),
         }),
         attacks: new fields.SchemaField({
            used: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ nullable: true, initial: null }),
            group: new fields.NumberField({ initial: 0 }),
         }),
      };
   }

   /** @override */
   prepareBaseData() {
      this.equippable = true;
      super.prepareBaseData();
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
   }
}
