import { DialogFactory } from '../dialog/DialogFactory.mjs';
export class LightManager {
   static initialize() {
      Hooks.on('turnTrackerUpdate', (turnData) => {
         LightManager.updateLightUsage(turnData);
      });
   }

   static async showLightDialog() {
      if (!LightManager.hasSelectedToken()) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning2'));
      } else {
         const dataset = { dialog: 'lightmgr' };
         const caller = game.user;

         let token = LightManager.getToken();
         let items = token.actor.items;
         // Filter items to get those with system.isLight==true and map them to options
         let lightItems = items.filter(item => item.system.isLight);

         if (lightItems.length === 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }));
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
                     ui.notifications.warn(game.i18n.format('FADE.notifcation.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }));
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

   static getToken() {
      return canvas.tokens.controlled?.[0];
   }

   static hasSelectedToken() {
      const token = LightManager.getToken();
      return token !== null && token !== undefined;
   }

   static updateTokenLight(token, type, lightSource = null) {
      if (!LightManager.hasSelectedToken()) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning2'));
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
               const fuelType = lightSource.system.light.fuelType;
               const fuelSource = (!fuelType || fuelType === "" || fuelType === "none")
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
               color: "#d0A540",
               attenuation: 0.8,
               luminosity: 0.5,
               animation: {
                  type: "torch",
                  speed: 4,
                  intensity: 2
               }
            };
            break;
         case "lantern":
            lightSettings = {
               dim: lightData.radius,
               bright: 6,
               color: "#d0a750",
               attenuation: 0.7,
               luminosity: 0.5,
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
               attenuation: 0.7,
               luminosity: 0.5,
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
               attenuation: lightData.attenuation ?? 0.7,
               luminosity: lightData.luminosity ?? 0.5,
               animation: lightData.animation ?? {
                  type: "pulse",
                  speed: 2,
                  intensity: 3
               }
            };
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
         item.system.isLight &&
         item.system.light?.type === type &&
         item.system.quantity > 0
      );
   }

   static initializeLightUsage(item) {
      const lightData = item.system.light;
      lightData.turnsActive = lightData.turnsActive || 0;
      item.update({ "system.light.turnsActive": lightData.turnsActive });
   }

   /**
    * This will only update tokens on the current canvas.
    * @param {any} turnData
    */
   static updateLightUsage(turnData) {
      const turnDelta = Number(turnData.dungeon.session) - Number(turnData.dungeon.prevTurn);

      for (let token of canvas.tokens.placeables) {
         const lightActive = token.document.getFlag('world', 'lightActive');
         const type = token.document.getFlag('world', 'lightType');
         const lightSource = lightActive ? LightManager.getLightSource(token.actor, type) : null;
         if (lightActive && lightSource && !isNaN(turnDelta)) {
            let turnsActive = lightSource.system.light.turnsActive;
            let duration = lightSource.system.light.duration;

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

               lightSource.system.light.turnsActive = turnsActive;
               lightSource.update({ "system.light.turnsActive": turnsActive });
            }
         }
      }
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

      // Extract the fuel type from the lightSource
      const fuelType = lightSource.system.light.fuelType;

      // If there's no external fuel source needed, use the lightSource itself
      if (!fuelType || fuelType === "" || fuelType === "none") {
         fuelItem = lightSource;
      } else {
         // Find an item in the actor's inventory that matches the fuelType and has a quantity > 0
         fuelItem = actor.items.find(item => item.type === "item" && item.system.fuelType == fuelType && item.system.quantity > 0);
      }

      return fuelItem;
   }

   static consumeItem(item, token = null) {
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