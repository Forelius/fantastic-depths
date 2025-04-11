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

   constructor(object, options = {}) {
      super(object, options);
      this.editScores = false;
   }

   /** @override */
   async getData() {
      const context = await super.getData();
      context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
      context.editScores = this.editScores;
      context.hasAbilityScoreMods = true;
      return context;
   }

   /**
    * @override
    */
   activateListeners(html) {
      super.activateListeners(html);
      html.on('click', '.edit-scores', async (event) => {
         this.editScores = !this.editScores;
         html.find('.ability-score-input, .ability-score, .ability-mod').toggle();
      });
   }

   /** @inheritDoc */
   async _renderOuter() {
      const html = await super._renderOuter();
      if (this.actor.system.details?.level > 0) {
         const header = html[0].querySelector(".window-title");
         const actorData = this.document.toObject(false);
         const level = game.i18n.localize('FADE.Actor.Level');
         header.append(`(${actorData.system.details.species} ${actorData.system.details.class}, ${level} ${actorData.system.details.level})`);
      }
      return html;
   }
}