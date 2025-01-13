import { fadeItem } from './fadeItem.mjs';
import { LightManager } from '../sys/LightManager.mjs';

export class LightItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();          
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.actor) {
         const tokens = canvas.tokens?.placeables?.filter(t => t.document.actorId === this.actor.id) ?? [];
         for (let token of tokens) {
            const lightSettings = LightManager.getLightSettings(this.system.light);
            if (lightSettings && token.document.light.dim > 0) {
               console.debug(`Updating light settings for ${token.name}`);
               token.document.update({ light: lightSettings });
            }
         }
      }
   }
}