import { fadeItem } from './fadeItem.mjs';

export class LightItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /**
    * Does this light source require and external fuel such as lantern oil.
    */
   get usesExternalFuel() {
      return this.system.light.fuelType?.length > 0;
   }

   /**
    * Is the torch burnt out or does the lantern have any oil?
    * NOTE: A duration of null means infinite duration.
    */
   get hasFuel() {
      return this.system.light.duration == null
         || (this.system.light.secondsRemain > 0 && this.system.quantity > 0);
   }

   /**
    * If the item is it's own fuel source and quantity is greater than one, than this light item. 
    * If there is an external fuel source and at least one exists, then return that item.
    * Otherwise return null.
    */
   get nextFuelItem() {
      let fuelItem = null;
      // Extract the fuel type from the lightSource
      // If there's no external fuel source needed, use the lightSource itself
      if (this.usesExternalFuel === false && (this.system.quantity === null || this.system.quantity > 0)) {
         fuelItem = this;
      } else if (this.usesExternalFuel === true) {
         const fuelType = this.system.light.fuelType;

         // Find an item in the actor's inventory that matches the fuelType and has a quantity not equal to zero
         fuelItem = this.actor?.items.find(item => item.type === 'item' && item.system.fuelType === fuelType
            && (item.system.quantity === null || item.system.quantity > 0)) ?? null;
      }
      return fuelItem;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.actor) {
         const token = this.ownerToken;
         if (token) {
            const lightSettings = this.system.getLightSettings();
            // If this item owner's token is currently a light source...
            if (token.document.light.dim > 0) {
               //console.debug(`Updating ${this.name} for ${token.name}:`, this.system.light, lightSettings);
               token.document.update({ light: lightSettings });
            }
         }
      }
   }

   async enableLight() {
      const token = this.ownerToken;
      if (token === null || token === undefined) {
         this.notify(game.i18n.localize('FADE.notification.noTokenWarning2'), 'warn');
      } else {
         // If the light item's quantity is zero...
         if (this.system.quantity === 0) {
            this.notify(game.i18n.format('FADE.Item.light.noMoreItem', {
               actor: token.name,
               item: this.name
            }), 'error');
         }
         else {
            if (this.hasFuel === false && this.nextFuelItem && this.usesExternalFuel === true) {
               // Consume fuel
               await this.consumeFuel();
            } else if (this.usesExternalFuel === false && this.system.light.secondsRemain === 0) {
               await this.update({ "system.light.secondsRemain": (this.system.light.duration * 600) });
            }
            if (this.hasFuel === true) {
               const lightSettings = this.system.getLightSettings();
               await this.actor.setActiveLight(this.id);
               await this.update({ "system.light.enabled": true });
               await token.document.update({ light: lightSettings });
               this.notify(game.i18n.format('FADE.Item.light.enabled', { actor: token.name, item: this.name }), 'info');
            }
         }
      }
   }

   /**
    * Consumes the fuel.
    */
   async consumeFuel() {
      // If this light item needs more fuel...
      if (this.hasFuel === false) {
         const token = this.ownerToken;
         const nextFuelItem = this.nextFuelItem;
         if (this.usesExternalFuel == true) {
            if (nextFuelItem) {
               await nextFuelItem.update({ "system.quantity": Math.max(0, nextFuelItem.system.quantity - 1) });
               await this.update({ "system.light.secondsRemain": (this.system.light.duration * 600), "system.light.enabled": true });
            } else {
               this.notify(game.i18n.format('FADE.Item.light.noFuel', { actor: token?.name }), 'warn');
               await token.actor.setActiveLight(null);
               await this.update({ "system.light.secondsRemain": 0, "system.light.enabled": false });
            }
         } else {
            // Torch or candle. This is only called after the torch is burnt out.
            await this.update({ "system.quantity": Math.max(0, this.system.quantity - 1) });
            await this.update({ "system.light.secondsRemain": 0, "system.light.enabled": false });
            this.notify(game.i18n.format('FADE.Item.light.disabled', { actor: token.name }), 'info');
         }
      }
   }

   notify(message, type = null) {
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