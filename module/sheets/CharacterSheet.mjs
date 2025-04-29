import { CharacterSheet2 } from './CharacterSheet2.mjs';

/**
 * Extend the basic FDActorSheetV2 with some very simple modifications
 * @extends {FDActorSheetV2}
 */
export class CharacterSheet extends CharacterSheet2 {   
   static DEFAULT_OPTIONS = {
      position: {
         top: 150,
         width: 650,
         height: 600,
      },
      form: {
         submitOnChange: true
      },
      classes: ['character'],
   }

   static PARTS = {
      //header: {
      //   template: "systems/fantastic-depths/templates/actor/character/header.hbs",
      //},
      tabnav: {
         template: "systems/fantastic-depths/templates/actor/character/side-tabs.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/character/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/character/items.hbs",
         scrollable: [".tab"]
      },
      skills: {
         template: "systems/fantastic-depths/templates/actor/character/skills.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/actor/character/spells.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/actor/character/description.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/actor/character/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/actor/character/gmOnly.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "abilities"
   }


   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ['tabnav', 'abilities'];

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         options.parts.push('items');
         options.parts.push('skills');
         if (this.actor.system.config.maxSpellLevel > 0) {
            options.parts.push('spells');
         }
         options.parts.push('description');
      }
      if (game.user.isGM) {
         options.parts.push('effects');
         options.parts.push('gmOnly');
      }
   }

   async _prepareContext(options) {
      const context = await super._prepareContext();
      context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
      context.editScores = this.editScores;
      context.hasAbilityScoreMods = true;
      // Prepare the tabs.
      context.tabs = this.#getTabs();
      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const group = 'primary';

      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = 'abilities';

      const tabs = {
         abilities: { id: 'abilities', group, label: 'FADE.tabs.abilities' },
         description: { id: 'description', group, label: 'FADE.tabs.description' },
         effects: { id: 'effects', group, label: 'FADE.tabs.effects' },
      }

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         tabs.items = { id: 'items', group, label: 'FADE.items' };
         tabs.skills = { id: 'skills', group, label: 'FADE.tabs.skills' };
      }

      if (this.actor.system.config.maxSpellLevel > 0) {
         tabs.spells = { id: 'spells', group, label: 'FADE.tabs.spells' };
      }

      if (game.user.isGM) {
         tabs.gmOnly = { id: 'gmOnly', group, label: 'FADE.tabs.gmOnly' };
      }

      for (const tab of Object.values(tabs)) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }
}