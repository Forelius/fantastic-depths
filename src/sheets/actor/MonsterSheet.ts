import { FDActorSheetV2 } from "./FDActorSheetV2.js";
import { SheetTab } from "../SheetTab.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {FDActorSheetV2}
 */
export class MonsterSheet extends FDActorSheetV2 {
   constructor(options = {}) {
      super(options);
      this.editScores = false;
   }

   static DEFAULT_OPTIONS: Record<string, unknown> = {
      position: {
         width: 650,
         height: 600,
      },
      form: {
         submitOnChange: true
      },
      classes: ["monster"],
      actions: {
         cycleAttackGroup: MonsterSheet.#clickAttackGroup
      }
   }

   static PARTS: Record<string, unknown> = {
      header: {
         template: "systems/fantastic-depths/templates/actor/monster/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/monster/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/shared/items.hbs",
      },
      skills: {
         template: "systems/fantastic-depths/templates/actor/monster/skills.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/actor/shared/spellsMulti.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/actor/monster/description.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/actor/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/actor/monster/gmOnly.hbs",
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
         if (this.actor.system.config.maxSpellLevel > 0) {
            options.parts.push("spells");
         }
         options.parts.push("description");
      }
      if (game.user.isGM) {
         options.parts.push("effects");
         options.parts.push("gmOnly");
      }
   }

   async _prepareContext() {
      const context = await super._prepareContext();
      context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      context.hasAbilityScores = abilityScoreSetting !== "none";
      context.hasAbilityScoreMods = abilityScoreSetting === "withmod";
      context.editScores = this.editScores;
      context.specialAbilities = [
         ...context.specialAbilities,
         ...context.exploration.map(item => item.item)
      ];
      context.exploration = [];
      // Prepare the tabs.
      context.tabs = this.#getTabs();
      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, SheetTab>}
   */
   #getTabs() {
      const group = "primary";

      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "abilities";

      const tabs: Record<string, SheetTab> = {
         abilities: new SheetTab("abilities", group, "FADE.tabs.abilities"),
         description: new SheetTab("description", group, "FADE.tabs.description"),
         effects: new SheetTab("effects", group, "FADE.tabs.effects"),
      }

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         tabs.items = new SheetTab("items", group, "FADE.items");
         tabs.skills = new SheetTab("skills", group, "FADE.tabs.skills");
      }

      if (this.actor.system.config.maxSpellLevel > 0) {
         tabs.spells = new SheetTab("spells", group, "FADE.tabs.spells");
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

   static async #clickAttackGroup(this: MonsterSheet, event) {
      const item = this._getItemFromActor(event);
      await item.update({ "system.attacks.group": (item.system.attacks.group + 1) % 6 });
   }
}