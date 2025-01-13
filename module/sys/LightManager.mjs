import { DialogFactory } from '../dialog/DialogFactory.mjs';
export class LightManager {
   static initialize() {
      Hooks.on('turnTrackerUpdate', (turnData) => {
         LightManager.updateLightUsage(turnData);
      });
   }

   static async showLightDialog() {
      if (!LightManager.hasSelectedToken()) {
         LightManager.notify(game.i18n.localize('FADE.notification.noTokenWarning2'), 'warn');
      } else {
         const dataset = { dialog: 'lightmgr' };
         const caller = game.user;

         let token = LightManager.getToken();
         let items = token.actor.items;
         // Filter items to get those with system.isLight==true and map them to options
         let lightItems = items.filter(item => item.system.isLight);

         if (lightItems.length === 0) {
            LightManager.notify(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }), 'warn');
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
                     LightManager.notify(game.i18n.format('FADE.notifcation.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }), 'warn');
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

   /**
    * Configures the token's light properties
    * @param {any} token The token to configure.
    * @param {any} type The type of light this is (torch, lantern, magic, custom).
    * @param {any} lightItem Light source item.
    */
   static updateTokenLight(token, type, lightItem) {
      if (!LightManager.hasSelectedToken()) {
         LightManager.notify(game.i18n.localize('FADE.notification.noTokenWarning2'), 'warn');
      } else {
         let canUpdate = true;
         if (!lightItem) {
            LightManager.notify(game.i18n.format('FADE.notification.missingItem2', {
               actor: token.name,
               type: game.i18n.format(`FADE.Item.light.lightTypes.${type}`)
            }), 'warn');
            canUpdate = false;
            token.actor.update({ "system.activeLight": null });
         } else if (lightItem.system.quantity <= 0) {
            LightManager.notify(game.i18n.format('FADE.Item.light.noMoreItem', {
               actor: token.name,
               item: lightItem.name
            }), 'error');
            canUpdate = false;
            token.actor.update({ "system.activeLight": null });
         } else {
            // Check for fuel source if applicable
            const fuelType = lightItem.system.light.fuelType;
            const fuelSource = (!fuelType || fuelType === "" || fuelType === "none") ? lightItem : LightManager.getFuelItem(token.actor, lightItem);

            if (fuelSource == null || fuelSource.system.quantity <= 0) {
               LightManager.notify(game.i18n.format('FADE.Item.light.noFuel', {
                  actor: token.name,
                  item: lightItem.name
               }), 'error');
               canUpdate = false;
               token.actor.update({ "system.activeLight": null });
            } else {
               LightManager.initializeLightUsage(lightItem);
            }
         }

         if (canUpdate) {
            const lightSettings = LightManager.getLightSettings(lightItem.system.light);
            if (lightSettings) {
               token.document.update({ light: lightSettings });
               LightManager.notify(game.i18n.format('FADE.Item.light.enabled', {
                  actor: token.name,
                  item: lightItem.name
               }), 'info');
            }
         }
      }
   }

   static getLightSettings(lightData) {
      let lightSettings = {};

      switch (lightData.type) {
         case "torch":
            lightSettings = {
               dim: 30,
               bright: 6,
               color: "#d0A540",
               attenuation: 0.8,
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
               attenuation: 0.7,
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
               attenuation: 0.7,
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
               attenuation: 0.7,
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
               attenuation: 0.7,
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
               attenuation: lightData.attenuation ?? 0.7,
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
      item.actor?.update({ "system.activeLight": item.id });
   }

   /**
    * This will only update tokens on the current canvas.
    * @param {any} turnData
    */
   static updateLightUsage(turnData) {
      const turnDelta = Number(turnData.dungeon.session) - Number(turnData.dungeon.prevTurn);

      for (let token of canvas.tokens.placeables) {
         const lightItem = token.actor.items.get(token.actor.system.activeLight);
         if (lightItem && !isNaN(turnDelta)) {
            let turnsActive = lightItem.system.light.turnsActive;
            let duration = lightItem.system.light.duration;
            turnsActive = Math.max(0, turnsActive + turnDelta);
            // Determine the fuel source
            const fuelSource = LightManager.getFuelItem(token.actor, lightItem);
            if (fuelSource == null) {
               console.warn(`Fuel source not found for ${token.name}.`);
            } else {
               // If duration is not -1 and light has been active longer than the duration...
               if (duration !== -1 && turnsActive >= duration) {
                  LightManager.consumeItem(fuelSource, lightItem, token); // Pass the token for extinguishing the light
                  turnsActive = 0; // Reset turnsActive after consuming fuel
               }
               lightItem.system.light.turnsActive = turnsActive;
               lightItem.update({ "system.light.turnsActive": turnsActive });
            }
         }
      }
   }

   static toggleLight(token, state) {
      token.document.setFlag('world', 'lightActive', state); // Toggle active state
      if (!state) {
         token.actor.update({ "system.activeLight": null });
         token.document.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
         LightManager.notify(game.i18n.format('FADE.Item.light.disabled', { actor: token.name }), 'info');
      } else {
         // THIS NEVER HAPPENS?
         const type = token.document.getFlag('world', 'lightType');
         const lightSource = LightManager.getLightSource(token.actor, type);
         if (lightSource) {
            token.actor.update({ "system.activeLight": lightSource.id });
            token.document.update({ light: lightSource.system.light.settings }); // Restore light settings
         } else {
            token.actor.update({ "system.activeLight": null });
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

   static consumeItem(item, lightSource, token) {
      let newQuantity = item.system.quantity - 1;
      item.update({ "system.quantity": newQuantity });

      if (newQuantity <= 0) {
         LightManager.notify(game.i18n.format('FADE.Item.light.noFuel', {
            actor: token?.name ?? game.i18n.localize('TYPES.Actor.character'),
            item: item.name
         }), 'info');
         token.document.update({ light: { dim: 0, bright: 0 } });
         token.document.setFlag('world', 'lightActive', false);
         token.actor.update({ "system.activeLight": null });
      }
   }

   static notify(message, type = null) {
      const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
      ChatMessage.create({ speaker: speaker, content: message });
      if (type === 'warn') {
         ui.notifications.warn(message);
      } else if (type === 'error') {
         ui.notifications.error(message);
      }
      else {
         ui.notifications.info(message);
      }
   }
}