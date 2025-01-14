import { fadeItemDataModel } from "./fadeItemDataModel.mjs";
import { LightManager } from '../../sys/LightManager.mjs';

/**
 * Data model for a skill item extending fadeItemDataModel.
 */
export class LightItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema, // Include fields from fadeItemDataModel
         isLight: new fields.BooleanField({ required: false, initial: true }),
         light: new fields.SchemaField({
            type: new fields.StringField({ required: false, initial: "" }),
            duration: new fields.NumberField({ required: false, initial: 6 }),
            radius: new fields.NumberField({ required: false, initial: 30 }),
            fuelType: new fields.StringField({ required: false, initial: "" }),
            secondsActive: new fields.NumberField({ required: false, initial: 0 }),
            bright: new fields.NumberField({ required: false, initial: 6 }),
            color: new fields.StringField({ required: false, initial: "#d0a750" }),
            attenuation: new fields.NumberField({ required: false, initial: 0.7 }),
            luminosity: new fields.NumberField({ required: false, initial: 0.5 }),
            angle: new fields.NumberField({ required: false, initial: 360 }),
            animation: new fields.SchemaField({
               type: new fields.StringField({ required: false, initial: "torch" }),
               speed: new fields.NumberField({ required: false, initial: 2 }),
               intensity: new fields.NumberField({ required: false, initial: 3 })
            })
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.isLight = true;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      const lightSettings = LightManager.getLightSettings(this.light);
      if (lightSettings && this.light.type !== 'custom') {
         //console.debug(`LightItemDataModel.prepareDerivedData ${this.light.type}:`, lightSettings.dim);
         this.light.radius = lightSettings.dim;
         this.light.bright = lightSettings.bright;
         this.light.attenuation = lightSettings.attenuation;
         this.light.luminosity = lightSettings.luminosity;
         this.light.angle = lightSettings.angle;
         this.light.color = lightSettings.color;
         this.light.animation.type = lightSettings.animation.type;
         this.light.animation.speed = lightSettings.animation.speed;
         this.light.animation.intensity = lightSettings.animation.intensity;
         this.updateSource({ light: this.light });
      }
   }
}