import { FDActorSheetV2 } from "./FDActorSheetV2.js";
import { SheetTab } from "../SheetTab.js";

/**
 * Bare-bones sheet for placeable prop actors (FDActorBase / type "prop").
 * @extends {FDActorSheetV2}
 */
export class FDPropSheet extends FDActorSheetV2 {
   static DEFAULT_OPTIONS: Record<string, unknown> = {
      position: {
         width: 650,
         height: 510,
      },
      form: {
         submitOnChange: true
      },
      classes: ["monster"],
   }

   static PARTS: Record<string, unknown> = {
      header: {
         template: "systems/fantastic-depths/templates/actor/prop/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/actor/prop/description.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/actor/prop/gmOnly.hbs",
      }
   }

   tabGroups = {
      primary: "description"
   }

   _configureRenderOptions(options) {
      super._configureRenderOptions(options);
      options.parts = ["header", "tabnav", "description"];
      if (game.user.isGM) {
         options.parts.push("gmOnly");
      }
   }

   async _prepareContext() {
      const context = await super._prepareContext();
      context.tabs = this.#getTabs();
      return context;
   }

   /** Props have no combat/item sheet categories. */
   async _prepareItems(_context) { }

   /**
    * Prepare an array of form header tabs.
    * @returns {Record<string, SheetTab>}
    */
   #getTabs(): Record<string, SheetTab> {
      const group = "primary";
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";

      const tabs: Record<string, SheetTab> = {
         description: new SheetTab("description", group, "FADE.tabs.description"),
      };

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
