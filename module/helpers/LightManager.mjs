import { DialogFactory } from '../dialog/DialogFactory.mjs';
export class LightManager {
   static initialize() {
      Hooks.on('turnTrackerUpdate', (turnData) => {
         LightManager.updateLightUsage(turnData);
      });
   }

   static async showLightDialog() {
      if (!LightManager.hasSelectedTokens()) {
         ui.notifications.error("No token selected. Please select a token to set lighting.");
      } else {
         const dataset = { dialog: 'lightmgr' };
         const caller = game.user;

         let token = canvas.tokens.controlled[0];
         let items = token.actor.items;
         // Filter items to get those with a "light" tag and map them to options
         let lightItems = [];
         items.forEach(item => {
            if (item.system.tags?.includes("light")) {
               lightItems.push(item);
            }
         });

         if (lightItems.length === 0) {
            ui.notifications.warn("No light source items found on this actor.");
         } else {
            // Render the dialog with the necessary data
            const dialogResponse = await DialogFactory(dataset, caller, { lightItems });

            // Early return if dialog was cancelled
            if (!dialogResponse || !dialogResponse.resp) {
               // Do nothing?
            } else {
               if (dialogResponse.resp.action === 'ignite') {
                  let selectedItem = items.get(dialogResponse.resp.itemId);
                  if (selectedItem) {
                     LightManager.updateTokenLight(token, selectedItem.system.light?.type, selectedItem);
                  } else {
                     ui.notifications.warn("Selected light source item not found.");
                  }
               } else if (dialogResponse.resp.action === 'extinguish') {
                  LightManager.toggleLight(token, false);
               } else {
                  // Do nothing?
               }
            }
         }
      }
   }

   static hasSelectedTokens() {
      return canvas.tokens.controlled.length > 0;
   }

   static updateTokenLight(token, type, lightSource = null) {
      if (!LightManager.hasSelectedTokens()) {
         ui.notifications.error("No token selected. Please select a token to set lighting.");
      } else {
         let canUpdate = true;
         lightSource = lightSource || LightManager.getLightSource(token.actor, type);

         if (type !== "none") {
            if (!lightSource) {
               ui.notifications.warn(`The character ${token.name} does not have a ${type} light item.`);
               canUpdate = false;
            } else if (lightSource.system.quantity <= 0) {
               ui.notifications.error(`${token.name} has no more ${lightSource.name} to light.`);
               canUpdate = false;
            } else {
               // Check for fuel source if applicable
               const fuel = lightSource.system.light.fuel;
               const fuelSource = (!fuel || fuel === "" || fuel === "none")
                  ? lightSource
                  : LightManager.getFuelItem(token.actor, lightSource);

               if (fuelSource == null || fuelSource.system.quantity <= 0) {
                  ui.notifications.error(`${token.name} has no fuel for the ${lightSource.name}.`);
                  canUpdate = false;
               } else {
                  LightManager.initializeLightUsage(lightSource);
               }
            }
         }

         if (canUpdate) {
            const lightSettings = LightManager.getLightSettings(lightSource.system.light);
            if (lightSettings) {
               token.document.update({ light: lightSettings });
               token.document.setFlag('world', 'lightActive', type !== "none");
               token.document.setFlag('world', 'lightType', type);
               ui.notifications.info(`${token.name} has ${type === "none" ? 'extinguished the light' : `lit a ${lightSource.name}`}.`);
            }
         }
      }
   }

   static getLightSettings(lightData) {
      let lightSettings = {};

      switch (lightData.type) {
         case "torch":
            lightSettings = {
               dim: lightData.radius,
               bright: 6,
               color: "#d0A530",
               attenuation: 0.8,
               luminosity: 0.5,
               animation: {
                  type: "flame",
                  speed: 4,
                  intensity: 2
               }
            };
            break;
         case "lantern":
            lightSettings = {
               dim: lightData.radius,
               bright: 6,
               color: "#d0D730",
               attenuation: 0.7,
               luminosity: 0.5,
               animation: {
                  type: "torch",
                  speed: 2,
                  intensity: 1
               }
            };
            break;
         case "magic":
            lightSettings = {
               dim: lightData.radius,
               bright: 6,
               color: "#2376a7",
               attenuation: 0.7,
               luminosity: 0.5,
               animation: {
                  type: "pulse",
                  speed: 2,
                  intensity: 3
               }
            };
            break;
         case "none":
            lightSettings = { dim: 0, bright: 0 }; // Turn off light
            break;
         default:
            ui.notifications.warn(`No settings defined for ${type}.`);
            lightSettings = null;
      }

      return lightSettings;
   }

   static getLightSource(actor, type) {
      return actor.items.find(item =>
         item.system.tags?.includes("light") &&
         item.system.light?.type === type &&
         item.system.quantity > 0
      );
   }

   static initializeLightUsage(item) {
      const lightData = item.system.light;
      lightData.usage = lightData.usage || { turnsActive: 0 };
      item.update({ "system.light.usage": lightData.usage });
   }

   static updateLightUsage(turnData) {
      const turnDelta = Number(turnData.dungeon.session) - Number(turnData.dungeon.prevTurn);

      canvas.tokens.placeables.forEach(token => {
         const lightActive = token.document.getFlag('world', 'lightActive');
         const type = token.document.getFlag('world', 'lightType');
         const lightSource = LightManager.getLightSource(token.actor, type);
         if (!(lightActive && lightSource && !isNaN(turnDelta))) {
            console.warn(`Skipping update for ${token.name}. Conditions not met.`);
         } else {
            let { turnsActive } = lightSource.system.light.usage;
            let duration = lightSource.system.light.duration;
            let fuel = lightSource.system.light.fuel;

            turnsActive = Math.max(0, turnsActive + turnDelta);

            // Determine the fuel source
            const fuelSource = LightManager.getFuelItem(token.actor, lightSource);

            if (fuelSource == null) {
               console.warn(`Fuel source not found for ${token.name}.`);
            } else {
               // If duration is not -1 and light has been active longer than the duration...
               if (duration !== -1 && turnsActive >= duration) {
                  LightManager.consumeItem(fuelSource, token); // Pass the token for extinguishing the light
                  turnsActive = 0; // Reset turnsActive after consuming fuel
               }

               lightSource.system.light.usage.turnsActive = turnsActive;
               lightSource.update({ "system.light.usage.turnsActive": turnsActive });
            }
         }
      });
   }

   static toggleLight(token, state) {
      token.document.setFlag('world', 'lightActive', state); // Toggle active state
      if (!state) {
         token.document.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
         ui.notifications.info(`${token.name}'s light source has been extinguished.`);
      } else {
         const type = token.document.getFlag('world', 'lightType');
         const lightSource = LightManager.getLightSource(token.actor, type);
         if (lightSource) {
            token.document.update({ light: lightSource.system.light.settings }); // Restore light settings
         }
      }
   }

   static getFuelItem(actor, lightSource) {
      let fuelItem = null;

      // Extract the fuel tag from the lightSource
      const fuelTag = lightSource.system.light.fuel;

      // If there's no external fuel source needed, use the lightSource itself
      if (!fuelTag || fuelTag === "" || fuelTag === "none") {
         fuelItem = lightSource;
      } else {
         // Find an item in the actor's inventory that matches the fuelTag and has a quantity > 0
         fuelItem = actor.items.find(item => item.system.tags?.includes(fuelTag) && item.system.quantity > 0);
      }

      return fuelItem;
   }

   static consumeItem(item, token = null) {
      console.log("consumeItem:", item);

      let newQuantity = item.system.quantity - 1;
      item.update({ "system.quantity": newQuantity });

      if (newQuantity <= 0) {
         ui.notifications.info(`${item.name} has been used up.`);
         if (token) {
            token.document.update({ light: { dim: 0, bright: 0 } });
            token.document.setFlag('world', 'lightActive', false);
         }
      }
   }
}