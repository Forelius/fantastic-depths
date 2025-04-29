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
      header: {
         template: "systems/fantastic-depths/templates/actor/character/header.hbs",
      },
      tabnav: {
         template: "systems/fantastic-depths/templates/actor/character/side-tabs.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/character/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/character/items.hbs",
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


   /**
   * Replace the HTML of the application with the result provided by the rendering backend.
   * An Application subclass should implement this method in order for the Application to be renderable.
   * @param {any} result            The result returned by the application rendering backend
   * @param {HTMLElement} content   The content element into which the rendered result must be inserted
   * @param {RenderOptions} options Options which configure application rendering behavior
   * @protected
   */
   _replaceHTML(result, content, options) {
      super._replaceHTML(result, content, options);
      // Move the tabs
      const navTabs = content.querySelector('.nav-tabs-right');
      this._frame.appendChild(navTabs);
   }
}