import { DialogFactory } from '../dialog/DialogFactory';
export class LightManager {
   static initialize() { }

   static getToken() {
      return canvas.tokens?.controlled?.[0]?.document;
   }

   static hasSelectedToken() {
      return LightManager.getToken() !== undefined;
   }

   /**
    * updatedWorldTime event handler. This is setup in the fantastic-depths file.
    * @param {any} worldTime The current worldtime measured in seconds.
    * @param {any} dt Time difference from this time change, measured in seconds.
    * @param {any} options
    * @param {any} userId The user who triggered the time changed.
    */
   static async onUpdateWorldTime(worldTime, dt, options, userId) {
      if (dt !== 0) {
         // Iterate over all canvas tokens
         for (let placeable of canvas.tokens.placeables) {
            const actor = placeable.actor ?? placeable.document.actor;
            if (actor) {
               // Get the token actor's active light.
               const lightItem = actor.items.get(actor.system.activeLight);
               if (lightItem && lightItem.system.light.duration !== null) {
                  // Get the current length of time that the item has been active.
                  const secondsRemain = Math.max(0, lightItem.system.light.secondsRemain - dt);
                  await lightItem.update({ "system.light.secondsRemain": secondsRemain });
                  // If all of the fuel has been used...
                  if (secondsRemain <= 0) {
                     // Expired so turn off light.
                     await actor.setActiveLight(null);
                     // If this is a torch or other self-fueled light...
                     if (lightItem.usesExternalFuel === false) {
                        await lightItem.consumeFuel(); // Pass the token for extinguishing the light
                     }
                  }
               }
            }
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
         const token = LightManager.getToken();
         const actorItems = token.actor.items;
         // Filter items to get those with system.isLight==true and map them to options
         const lightItems = actorItems.filter(item => item.system.isLight === true && item.system.quantity > 0 && (item.hasFuel || item.nextFuelItem));

         if (lightItems.length === 0) {
            LightManager.notify(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }), 'warn');
         } else {
            // Render the dialog with the necessary data
            const dialogResult = await DialogFactory(dataset, caller, { lightItems });

            // Early return if dialog was cancelled
            if (!dialogResult) {
               // Do nothing?
            } else {
               // Get the selected light item from the user's selection.
               const selectedItem = actorItems.get(dialogResult.lightItem);

               if (dialogResult.action === 'ignite') {
                  // If the light item exists.
                  if (selectedItem) {
                     await selectedItem.enableLight(token);
                  } else {
                     LightManager.notify(game.i18n.format('FADE.notifcation.missingItem', { type: game.i18n.localize('FADE.dialog.lightSource') }), 'warn');
                  }
               } else if (dialogResult.action === 'extinguish') {
                  await selectedItem.disableLight(token);
               }
            }
         }
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
