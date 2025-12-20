import { FDActorSheetV2 } from "./FDActorSheetV2.js";
import { SheetTab } from "../SheetTab.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {FDActorSheetV2}
 */
export class CharacterSheetBase extends FDActorSheetV2 {
   constructor(options = {}) {
      super(options);
      this.editScores = false;
   }

   get title() {
      let result = super.title;
      const actorData = this.document.toObject(false);
      const level = game.i18n.localize("FADE.Actor.Level");
      if (actorData.system.details.species === actorData.system.details.class) {
         result = `${result} (${actorData.system.details.class}, ${level} ${actorData.system.details.level})`;
      } else {
         result = `${result} (${actorData.system.details.species} ${actorData.system.details.class}, ${level} ${actorData.system.details.level})`;
      }

      return result;
   }

   static DEFAULT_OPTIONS: Record<string, unknown> = {
      position: {
         width: 650,
         height: 600,
      },
      form: {
         submitOnChange: true
      },
      classes: ["character"],
   }

   static PARTS: Record<string, unknown> = {
      header: {
         template: "systems/fantastic-depths/templates/actor/character/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/character/abilitiesNoHeader.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/shared/items.hbs",
      },
      skills: {
         template: "systems/fantastic-depths/templates/actor/character/skills.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/actor/shared/spellsMulti.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/actor/character/description.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/actor/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/actor/character/gmOnly.hbs",
      }
   }

   tabGroups = {
      primary: "abilities"
   }

   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ["header", "tabnav", "abilities"];

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         options.parts.push("items");
         options.parts.push("skills");
         const classSystem = game.fade.registry.getSystem("classSystem");
         if (classSystem.canCastSpells(this.actor)) {
            options.parts.push("spells");
         }
         options.parts.push("effects");
         options.parts.push("description");
      }
      if (game.user.isGM) {
         options.parts.push("gmOnly");
      }
   }

   async _prepareContext() {
      const context = await super._prepareContext();
      context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
      context.hasMultiClass = game.settings.get(game.system.id, "classSystem") !== "single";
      context.editScores = this.editScores;
      context.hasAbilityScoreMods = true;
      context.currentXp = Number(this.actor.system.details.xp.value);
      context.nextXp = Number(this.actor.system.details.xp.next);
      // Prepare the tabs.
      context.tabs = this.#getTabs();
      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, SheetTab>}
   */
   #getTabs(): Record<string, SheetTab> {
      const group = "primary";

      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "abilities";

      const tabs: Record<string, SheetTab> = {
         abilities: new SheetTab("abilities", group, "FADE.tabs.abilities"),
      }

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         tabs.items = new SheetTab("items", group, "FADE.items");
         tabs.skills = new SheetTab("skills", group, "FADE.tabs.skills");
         const classSystem = game.fade.registry.getSystem("classSystem");
         if (classSystem.canCastSpells(this.actor)) {
            tabs.spells = new SheetTab("spells", group, "FADE.tabs.spells");
         }
         tabs.effects = new SheetTab("effects", group, "FADE.tabs.effects");
         tabs.description = new SheetTab("description", group, "FADE.tabs.description");
      }

      if (game.user.isGM) {
         tabs.gmOnly = new SheetTab("gmOnly", group, "FADE.tabs.gmOnly");
      }

      for (const tab of Object.values(tabs) as SheetTab[]) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }
}