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

   constructor(object, options = {}) {
      super(object, options);
      this.editScores = false;
   }

   /** @override */
   async getData() {
      const context = await super.getData();
      context.editScores = this.editScores;
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      context.hasAbilityScores = abilityScoreSetting !== "none";
      context.hasAbilityScoreMods = abilityScoreSetting === "withmod";
      return context;
   }

   /**
   * @override
   */
   activateListeners(html) {
      super.activateListeners(html);
      html.on('click', '.edit-scores', async (event) => {
         this.editScores = !this.editScores;
         html.find('.ability-score-input, .ability-score').toggle();
      });
   }

   /** @override */
   async render(force, options = {}) {
      // Call the original render method with modified options
      await super.render(force, options);
      // Use setTimeout to allow the DOM to be fully updated before restoring collapsed state
      setTimeout(async () => { await this._restoreCollapsedState(); }, 0);
   }
}