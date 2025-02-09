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
            enabled: new fields.BooleanField({ required: false, initial: false }),
            type: new fields.StringField({ required: false, initial: "" }),
            // Specified in ten minute turns. Each turn is 600 seconds.
            duration: new fields.NumberField({ required: false, initial: 6, nullable: true }),
            radius: new fields.NumberField({ required: false, initial: 30 }),
            // Indicates what type of fuel is used by this light source, if any.
            fuelType: new fields.StringField({ required: false, initial: "" }),
            secondsRemain: new fields.NumberField({ required: false, initial: 0 }),
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
      // If the light type is not custom...
      if (this.light.type !== 'custom') {
         this.#setFromSettings();
      }
   }

   /**
    * Get this light's settings in a format that can be used to set a token's light.
    * @returns
    */
   getLightSettings() {
      const lightData = this.light;
      let lightSettings = {};

      switch (lightData.type) {
         case "torch":
            lightSettings = {
               dim: 30,
               bright: 6,
               color: "#d0A540",
               attenuation: 0.9,
               luminosity: 0.5,
               angle: 360,
               animation: {
                  type: "torch",
                  speed: 4,
                  intensity: 2
               }
            };
            break;
         case "lantern":
            lightSettings = {
               dim: 30,
               bright: 6,
               color: "#d0a750",
               attenuation: 0.9,
               luminosity: 0.5,
               angle: 360,
               animation: {
                  type: "torch",
                  speed: 2,
                  intensity: 2
               }
            };
            break;
         case "bullseye":
            lightSettings = {
               dim: 50,
               bright: 6,
               color: "#d0a750",
               attenuation: 0.8,
               luminosity: 0.5,
               angle: 30,
               animation: {
                  type: "torch",
                  speed: 2,
                  intensity: 2
               }
            };
            break;
         case "candle":
            lightSettings = {
               dim: 15,
               bright: 3,
               color: "#d0a750",
               attenuation: 0.9,
               luminosity: 0.35,
               angle: 360,
               animation: {
                  type: "torch",
                  speed: 2,
                  intensity: 2
               }
            };
            break;
         case "magic":
            lightSettings = {
               dim: lightData.radius,
               bright: 6,
               color: "#2376a7",
               attenuation: 0.9,
               luminosity: 0.5,
               angle: 360,
               animation: {
                  type: "pulse",
                  speed: 2,
                  intensity: 3
               }
            };
            break;
         case "custom":
            lightSettings = {
               dim: lightData.radius,
               bright: lightData.bright ?? 6,
               color: lightData.color ?? "#d0a750",
               attenuation: lightData.attenuation ?? 0.9,
               luminosity: lightData.luminosity ?? 0.5,
               angle: lightData.angle ?? 360,
               animation: lightData.animation ?? {
                  type: "torch",
                  speed: 2,
                  intensity: 3
               }
            };
            break;
         case "none":
            lightSettings = { dim: 0, bright: 0 }; // Turn off light
            break;
         default:
            console.warn(`No settings defined for ${type}.`);
            lightSettings = null;
      }

      return lightSettings;
   }

   #setFromSettings() {
      const lightSettings = this.getLightSettings();
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