import {
   createDefaultMovementMode,
   MovementModeData,
} from "../dataModel/movement/MovementModeData.js";
import { CodeMigrate } from "../../sys/migration.js";

const { ArrayField, EmbeddedDataField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing FDPhysicalActor data.
 */
export class FDPhysicalActorField extends EmbeddedDataField {
   constructor(options) {
      super(FDPhysicalActorData, options);
   }
}

export class FDPhysicalActorData extends foundry.abstract.DataModel {
   static defineSchema() {
      return {
         hp: new SchemaField({
            hd: new StringField({ initial: "1d8" }),
            value: new NumberField({ initial: 5 }),
            max: new NumberField({ initial: 5 }),
         }),
         movement: new SchemaField({
            modifiers: new SchemaField({
               encumbrance: new NumberField({ nullable: true, initial: 1 }),
            }),
            modes: new ArrayField(new EmbeddedDataField(MovementModeData), {
               initial: () => [createDefaultMovementMode("primary")],
            }),
         }),
         encumbrance: new SchemaField({
            value: new NumberField({ initial: 0 }),
            max: new NumberField({ initial: CONFIG.FADE.Encumbrance.Expert.maxLoad }),
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
      };
   }

   /**
    * Migrate legacy movement / movement2 into movement.modes.
    * @inheritDoc
    */
   static migrateData(source) {
      CodeMigrate.migratePhysicalActorSource(source);
      return super.migrateData(source);
   }
}
