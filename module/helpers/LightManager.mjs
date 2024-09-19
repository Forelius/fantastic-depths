export class LightManager {
   static initialize() {
      Hooks.on('turnTrackerUpdate', (turnData) => {
         LightManager.updateLightUsage(turnData);
      });
   }

   static showLightDialog() {
      if (!LightManager.hasSelectedTokens()) {
         ui.notifications.error("No token selected. Please select a token to set lighting.");
      } else {
         new Dialog({
            title: "Light Manager",
            content: `<p>Select a lighting option for the selected tokens:</p>`,
            buttons: {
               none: {
                  label: "No Light",
                  callback: () => LightManager.updateTokensLight("none")
               },
               torch: {
                  label: "Torch",
                  callback: () => LightManager.updateTokensLight("torch")
               },
               lantern: {
                  label: "Lantern",
                  callback: () => LightManager.updateTokensLight("lantern")
               },
               extinguish: {
                  label: "Extinguish",
                  callback: () => LightManager.toggleLight(false)
               },
               close: {
                  label: "Close"
               }
            },
            default: "close",
            close: () => console.log("Light Manager dialog closed.")
         }).render(true);
      }
   }

   static hasSelectedTokens() {
      return canvas.tokens.controlled.length > 0;
   }

   static updateTokensLight(type) {
      if (!LightManager.hasSelectedTokens()) {
         ui.notifications.error("No token selected. Please select a token to set lighting.");
      } else {
         canvas.tokens.controlled.forEach(token => {
            let canUpdate = true;
            let lightSource = null;

            if (type !== "none") {
               lightSource = LightManager.getLightSource(token.actor, type);
               if (lightSource) {
                  if (lightSource.system.quantity <= 0) {
                     ui.notifications.error(`${token.name} has no more ${type} to light.`);
                     canUpdate = false;
                  } else {
                     LightManager.initializeLightUsage(lightSource);
                  }
               } else {
                  ui.notifications.warn(`The character ${token.name} does not have a ${type}.`);
                  canUpdate = false;
               }
            }

            let lightSettings = LightManager.getLightSettings(type);
            canUpdate = canUpdate && lightSettings !== null;

            if (canUpdate) {
               token.document.update({ light: lightSettings });
               token.document.setFlag('world', 'lightActive', type !== "none");
               token.document.setFlag('world', 'lightType', type);
               ui.notifications.info(`${token.name} has ${type === "none" ? 'extinguished the light' : `lit a ${type}`}.`);
            }
         });
      }
   }

   static getLightSettings(type) {
      let lightSettings = {};

      switch (type) {
         case "torch":
            lightSettings = { dim: 20, bright: 10, color: "#FFA500", animation: { type: "torch", speed: 2, intensity: 5 } };
            break;
         case "lantern":
            lightSettings = { dim: 30, bright: 15, color: "#FFD700", animation: { type: "torch", speed: 3, intensity: 4 } };
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
      return actor.items.find(item => item.system.tags?.includes("light") && item.system.light?.type === type);
   }

   static initializeLightUsage(item) {
      const lightData = item.system.light;
      lightData.usage = lightData.usage || { turnsActive: 0, duration: lightData.duration || 10 };
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
            let { turnsActive, duration, fuel } = lightSource.system.light.usage;
            turnsActive = Math.max(0, turnsActive + turnDelta);

            // Determine the fuel source
            const fuelSource = (!fuel || fuel === "" || fuel === "none")
               ? lightSource
               : LightManager.getFuelItem(token.actor, fuel);

            if (fuelSource == null) {
               console.warn(`Fuel source not found for ${token.name}.`);
            } else {
               if (turnsActive >= duration) {
                  LightManager.consumeItem(fuelSource, token); // Pass the token for extinguishing the light
                  turnsActive = 0; // Reset turnsActive after consuming fuel
               }

               lightSource.system.light.usage.turnsActive = turnsActive;
               lightSource.update({ "system.light.usage.turnsActive": turnsActive });
            }
         }
      });
   }

   static toggleLight(state) {
      canvas.tokens.controlled.forEach(token => {
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
      });
   }

   static getFuelItem(actor, fuelTag) {
      return actor.items.find(item => item.system.tags?.includes(fuelTag) && item.system.quantity > 0);
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