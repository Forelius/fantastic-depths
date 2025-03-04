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
               initial: 'features',
            },
         ],
      });
   }
}