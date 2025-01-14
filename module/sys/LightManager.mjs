import { DialogFactory } from '../dialog/DialogFactory.mjs';
export class LightManager {
   static initialize() {
      //   Hooks.on('turnTrackerUpdate', (turnData) => {
      //      LightManager.updateLightUsage(turnData);
      //   });
   }

   /**
    * updatedWorldTime event handler. This is setup in the fantastic-depths.mjs file.
    * @param {any} worldTime The current worldtime measured in seconds.
    * @param {any} dt Time difference from this time change, measured in seconds.
    * @param {any} options
    * @param {any} userId The user who triggered the time changed.
    */
   static onUpdateWorldTime(worldTime, dt, options, userId) {
      console.debug('updateLightUsage:', worldTime, dt, options, userId);

      // Iterate over all canvas tokens
      for (let token of canvas.tokens.placeables) {
         // Get the token actor's active light.
         const lightItem = token.actor.items.get(token.actor.system.activeLight);
         const fuelItem = token.actor.items.get(token.actor.system.activeFuel);
         if (fuelItem && lightItem) {
            // Convert the item's turn-based duration to seconds
            const durationSeconds = lightItem.system.light.duration * 60 * 10;
            // Get the current length of time that the item has been active.
            let secondsActive = Math.max(0, lightItem.system.light.secondsActive + dt);
            // If duration is not -1 and light has been active longer than the duration...
            if (dt !== -1 && secondsActive >= durationSeconds) {
               LightManager.consumeItem(fuelItem, lightItem, token); // Pass the token for extinguishing the light
               secondsActive = 0; // Reset secondsActive after consuming fuel
            }
            lightItem.update({ "system.light.secondsActive": secondsActive });
         }
      }
   }

   /**
    * Display the light dialog and handles the selected action.
    * @public
    */
   static async showLightDialog() {
      if (!LightManager.hasSelectedToken()) {
         LightManager.notify(game.i18n.localize('FADE.notification.noTokenWarning2'), 'warn');
      } else {
         const dataset = { dialog: 'lightmgr' };
         const caller = game.user;
         const tokens = LightManager.getTokens();

         for (const token of tokens) {
            const actorItems = token.actor.items;
            // Filter items to get those with system.isLight==true and map them to options
            const lightItems = actorItems.filter(item => item.system.isLight);

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
                     // Get the selected light item from the user's selection.
                     const selectedItem = actorItems.get(dialogResponse.resp.itemId);
                     // If the light item exists.
                     if (selectedItem) {
                        LightManager.updateTokenLight(token, selectedItem.system.light?.type, selectedItem);
                     } else {
                        LightManager.notify(game.i18n.format('FADE.notifcation.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }), 'warn');
                     }
                  } else if (dialogResponse.resp.action === 'extinguish') {
                     token.actor.setActiveLight(null, null);
                     token.document.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
                     LightManager.notify(game.i18n.format('FADE.Item.light.disabled', { actor: token.name }), 'info');
                  } else {
                     // Do nothing?
                  }
               }
            }
         }
      }
   }

   static getTokens() {
      return canvas.tokens.controlled;
   }

   static hasSelectedToken() {
      const tokens = LightManager.getTokens();
      return tokens?.length > 0;
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
         // If the light item exists...
         if (!lightItem) {
            LightManager.notify(game.i18n.format('FADE.notification.missingItem2', {
               actor: token.name,
               type: game.i18n.format(`FADE.Item.light.lightTypes.${type}`)
            }), 'warn');
            canUpdate = false;
            token.actor.setActiveLight(null, null);
         }
         // Else if the light item was found, but its quantity is less than or equal to zero...
         else if (lightItem.system.quantity <= 0) {
            LightManager.notify(game.i18n.format('FADE.Item.light.noMoreItem', {
               actor: token.name,
               item: lightItem.name
            }), 'error');
            canUpdate = false;
            token.actor.setActiveLight(null, null);
         }
         else {
            // Get the light item's fuel source, which could be itself in the case of a torch.
            const fuelType = lightItem.system.light.fuelType;
            // Get the fuel source item.
            const fuelItem = (!fuelType || fuelType === "" || fuelType === "none") ? lightItem : LightManager.getFuelItem(token.actor, lightItem);

            // If the fuel source does not exist...
            if (fuelItem == null || fuelItem.system.quantity <= 0) {
               LightManager.notify(game.i18n.format('FADE.Item.light.noFuel', {
                  actor: token.name,
                  item: lightItem.name
               }), 'error');
               canUpdate = false;
               token.actor.setActiveLight(null, null);
            }
            // 
            else {
               lightItem.update({ "system.light.secondsActive": lightItem.system.light.secondsActive ?? 0 });
               lightItem.actor?.setActiveLight(lightItem.id, fuelItem.id);
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

   static consumeItem(fuelItem, lightItem, token) {
      let newQuantity = fuelItem.system.quantity - 1;
      fuelItem.update({ "system.quantity": newQuantity });

      LightManager.notify(game.i18n.format('FADE.Item.light.noFuel', {
         actor: token?.name ?? game.i18n.localize('TYPES.Actor.character'),
         item: fuelItem.name
      }), 'info');
      token.document.update({ light: { dim: 0, bright: 0 } });
      token.document.setFlag('world', 'lightActive', false);
      token.actor.setActiveLight(null, null);
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