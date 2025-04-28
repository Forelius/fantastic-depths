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

   /** @inheritDoc */
   async _renderOuter() {
      const html = await super._renderOuter();
      if (this.actor.system.details?.level > 0) {
         const header = html.querySelector(".window-title");
         const actorData = this.document.toObject(false);
         const level = game.i18n.localize('FADE.Actor.Level');
         header.append(`(${actorData.system.details.species} ${actorData.system.details.class}, ${level} ${actorData.system.details.level})`);
      }
      return html;
   }
}