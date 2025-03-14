import { fadeActorSheet } from './fadeActorSheet.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CharacterSheet extends fadeActorSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/actor';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
         template: `${path}/CharacterSheet.hbs`,
         width: 600,
         height: 600,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'abilities',
            },
         ],
      });
   }

   /**
    * @override
    */
   activateListeners(html) {
      super.activateListeners(html);
      html.on('click', '.edit-scores', async (event) => {
         html.find('.ability-score-input, .ability-score').toggle();
      });
   }

   /** @override */
   async getData() {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = await super.getData();
      const equippedWeapons = [];
      // Iterate through items, allocating to arrays
      for (let item of context.items) {
         item.img = item.img || Item.DEFAULT_ICON;
         if (item.type === 'weapon' && item.system.equipped === true) {
            equippedWeapons.push(item);
         }
      }
      context.equippedWeapons = equippedWeapons;
      return context;
   }

   /** @inheritDoc */
   async _renderOuter() {
      const html = await super._renderOuter();
      const header = html[0].querySelector(".window-title");
      const actorData = this.document.toObject(false);
      const level = game.i18n.localize('FADE.Actor.Level');
      header.append(`(${actorData.system.details.species} ${actorData.system.details.class}, ${level} ${actorData.system.details.level})`);
      return html;
   }
}