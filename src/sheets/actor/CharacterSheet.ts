import { CharacterSheetBase } from "./CharacterSheetBase.js";
import { SheetTab } from "../SheetTab.js";
import { ClassSystemBase } from "../../sys/registry/ClassSystem.js";

/**
 * Extend the basic FDActorSheetV2 with some very simple modifications
 * @extends {CharacterSheetBase}
 */
export class CharacterSheet extends CharacterSheetBase {
   constructor(options = {}) {
      super(options);
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
      tabnav: {
         template: "systems/fantastic-depths/templates/actor/character/side-tabs.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/character/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/shared/items.hbs",
         scrollable: [".tab"]
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
      options.parts = ["tabnav", "abilities"];

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         options.parts.push("items");
         options.parts.push("skills");
         const classSystem: ClassSystemBase = game.fade.registry.getSystem("classSystem");
         if (classSystem.canCastSpells(this.actor)) {
            options.parts.push("spells");
         }
         options.parts.push("description");
         options.parts.push("effects");
      }
      if (game.user.isGM) {
         options.parts.push("gmOnly");
      }
   }

   async _prepareContext() {
      const context = await super._prepareContext();
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
         if (this.actor.system.config.maxSpellLevel > 0) {
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

   /**
   * Replace the HTML of the application with the result provided by the rendering backend.
   * An Application subclass should implement this method in order for the Application to be renderable.
   * @param {any} result            The result returned by the application rendering backend
   * @param {HTMLElement} content   The content element into which the rendered result must be inserted
   * @param {any} options Options which configure application rendering behavior
   * @protected
   */
   _replaceHTML(result, content, options) {
      super._replaceHTML(result, content, options);
      // Move the tabs
      const navTabs = content.querySelector(".nav-tabs-right");
      this._frame.appendChild(navTabs);
   }

   /**
    * Handle click events on a tab within the Application.
    * @param {any} event
    * @protected
    */
   _onClickTab(event) {
      const button = event.target.closest("[data-action]");
      const tab = button.dataset.tab;
      if (!tab || button.classList.contains("active") || (event.button !== 0)) return;
      const group = button.dataset.group;
      this.changeTab(tab, group);
   }

   /**
    * Change the active tab within a tab group in this Application instance.
    * @param {string} tab        The name of the tab which should become active
    * @param {string} group      The name of the tab group which defines the set of tabs
    * @param {object} [options]  Additional options which affect tab navigation
    * @param {boolean} [options.force=false]         Force changing the tab even if the new tab is already active
    * @param {boolean} [options.updatePosition=true] Update application position after changing the tab?
    */
   changeTab(tab, group, { force, updatePosition } = { force: false, updatePosition: true }) {
      if (!tab || !group) throw new Error("You must pass both the tab and tab group identifier");
      if ((this.tabGroups[group] === tab) && !force) return;  // No change necessary
      const tabElement = this.element.querySelector(`.tabs > [data-group="${group}"][data-tab="${tab}"]`);
      if (!tabElement) throw new Error(`No matching tab element found for group "${group}" and tab "${tab}"`);

      // Update tab navigation
      for (const t of this.element.querySelectorAll(`.tabs > [data-group="${group}"]`)) {
         t.classList.toggle("active", t.dataset.tab === tab);
      }

      // Update tab contents
      for (const section of this.element.querySelectorAll(`.tab[data-group="${group}"]`)) {
         section.classList.toggle("active", section.dataset.tab === tab);
      }
      this.tabGroups[group] = tab;

      // Update automatic width or height
      if (!updatePosition) return;
      const positionUpdate: Record<string, string> = {};
      if (this.options.position.width === "auto") positionUpdate.width = "auto";
      if (this.options.position.height === "auto") positionUpdate.height = "auto";
      if (!foundry.utils.isEmpty(positionUpdate)) this.setPosition(positionUpdate);
   }
}