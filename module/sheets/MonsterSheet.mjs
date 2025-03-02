import { fadeActorSheet } from './fadeActorSheet.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class MonsterSheet extends fadeActorSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/actor';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
         template: `${path}/MonsterSheet.hbs`,
         width: 680,
         height: 540,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'abilities',
            },
         ],
      });
   }

   /** @override */
   async render(force, options = {}) {
      // Adjust options before rendering based on item type
      options.width = 670;
      options.height = 540;

      // Call the original render method with modified options
      await super.render(force, options);

      // Use setTimeout to allow the DOM to be fully updated before restoring collapsed state
      setTimeout(async () => { await this._restoreCollapsedState(); }, 0);
   }
}