import { GearItemDataModel } from "./GearItemDataModel.mjs";
const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, ObjectField, StringField } = foundry.data.fields;
/**
 * Data model for a weapon item extending GearItemDataModel.
 */
export class WeaponItemDataModel extends GearItemDataModel {
   static defineSchema() {
      return {
         // Extend the schema from GearItemDataModel
         ...super.defineSchema(),
         // Fields specific to the "weapon" template
         damageRoll: new StringField({ required: true, initial: "1d6" }),
         damageLabel: new StringField({ required: false, initial: "1d6" }),
         damageType: new StringField({ required: true, initial: "physical" }),
         breath: new StringField({ nullable: true, initial: null }),
         canMelee: new BooleanField({ required: false, initial: true }),
         canRanged: new BooleanField({ required: false, initial: false }),
         canSet: new BooleanField({ required: false, initial: false }),
         isSlow: new BooleanField({ required: false, initial: false }),
         savingThrow: new StringField({ nullable: true, initial: null }),
         saveDmgFormula: new StringField({ nullable: true, initial: null }),
         mastery: new StringField({ required: false, initial: "" }),
         weaponType: new StringField({ required: false, initial: "" }),
         range: new SchemaField({
            short: new NumberField({ nullable: true, initial: null }),
            medium: new NumberField({ nullable: true, initial: null }),
            long: new NumberField({ nullable: true, initial: null })
         }),
         size: new StringField({ required: false, nullable:true, initial: null }),
         grip: new StringField({ required: false, nullable: true, initial: null }),
         natural: new BooleanField({ required: false, initial: false }),
         mod: new SchemaField({
            dmg: new NumberField({ initial: 0 }),
            toHit: new NumberField({ initial: 0 }),
            dmgRanged: new NumberField({ initial: 0 }),
            toHitRanged: new NumberField({ initial: 0 }),
            rangeMultiplier: new NumberField({ initial: 1 }),
            vsGroup: new ObjectField({}),
         }),
         attacks: new SchemaField({
            used: new NumberField({ initial: 0 }),
            max: new NumberField({ nullable: true, initial: null }),
            group: new NumberField({ initial: 0 }),
         }),
      };
   }

   /** @override */
   prepareBaseData() {
      this.equippable = true;
      super.prepareBaseData();
      if (this.natural === true) {
         this.weight = 0;
         this.weightEquipped = 0;
      }
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
   }
}
