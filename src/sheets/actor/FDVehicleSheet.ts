import { FDActorSheetV2 } from "./FDActorSheetV2.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {FDActorSheetV2}
 */
// @ts-ignore
export class FDVehicleSheet extends FDActorSheetV2 {
   constructor(options = {}) {
      super(options);
      this.combatVehicleTypes = ["mount", "siege", "vessel"];
      this.isCombatVehicle = this.combatVehicleTypes.includes(this.actor.system.vehicleType);
   }

   static DEFAULT_OPTIONS = {
      position: {
         width: 650,
         height: 510,
      },
      form: {
         submitOnChange: true
      },
      classes: ["monster"],
      actions: {
         cycleAttackGroup: FDVehicleSheet.#clickAttackGroup
      }
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/actor/vehicle/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/actor/vehicle/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/actor/vehicle/items.hbs",
      },
      skills: {
         template: "systems/fantastic-depths/templates/actor/vehicle/skills.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/actor/shared/spellsMulti.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/actor/vehicle/description.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/actor/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/actor/vehicle/gmOnly.hbs",
      }
   }

   tabGroups = {
      primary: "abilities"
   }

   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);

      const actorData = this.actor.system;

      // Completely overriding the parts
      options.parts = ["header", "tabnav", "description", "abilities"];

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         options.parts.push("items");
         if (actorData.vehicleType == "mount") {
            options.parts.push("skills");
            if (this.actor.system.config.maxSpellLevel > 0) {
               options.parts.push("spells");
            }
         }
      }
      if (game.user.isGM) {
         if (this.isCombatVehicle) {
            options.parts.push("effects");
         }
         options.parts.push("gmOnly");
      }
   }

   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
      context.hasAbilityScores = false;
      context.hasAbilityScoreMods = false;
      context.vehicleTypes = this._getVehicleTypeOptions();
      context.hasCombat = this.isCombatVehicle;
      // Prepare siege weapons
      context.siegeWeapons = context.weapons?.filter(i => i.system.weaponType === "siege");
      // Prepare the tabs.
      context.tabs = this.#getTabs();
      return context;
   }

   /**
    * Organize and classify Items for Actor sheets.
    * @param {object} context The context object to mutate
    */
   async _prepareItems(context) {
      if (this.isCombatVehicle) {
         await super._prepareItems(context);
         // Separate siege weapons from regular weapons

      } else {
         // Initialize arrays.
         let gear = [];
         const treasure = [];
         const items = [...this.actor.items];
         // Iterate through items, allocating to arrays
         for (const item of items) {
            item.img = item.img || Item.DEFAULT_ICON;
            // If a contained item...
            if (item.system.containerId?.length > 0) {
               // Check to see if container still exists.
               if (this.actor.items.get(item.system.containerId) === undefined) {
                  // The container does not exist, set containerId to null and add to gear items array
                  item.system.containerId = null;
                  gear.push(item);
               }
            } else {
               gear.push(item);
            }
            // If this is a treasure item...
            if (item.type === "treasure") {
               // Also add to the treasure array
               treasure.push(item);
            }
         }

         // Add derived data to each item
         gear = gear.map((item) => this._mapContainer(item));

         // Assign and return
         context.gear = gear;
         context.treasure = treasure;
         Object.assign(context, game.fade.registry.getSystem("encumbranceSystem").calcCategoryEnc(this.actor.items));
      }
   }

   _getVehicleTypeOptions() {
      const types = [];
      for (const type of CONFIG.FADE.VehicleTypes) {
         types.push({ text: game.i18n.localize(`FADE.Actor.vehicleTypes.${type}`), value: type });
      }
      return types.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   /**
    * Prepare an array of form header tabs.
    * @this {any}
    * @returns {any}
    */
   #getTabs() {
      const group = "primary";
      const actorData = this.actor.system;
      const tabs: any = {};
      if (this.isCombatVehicle) {
         // Default tab for first time it"s rendered this session
         if (!this.tabGroups[group]) this.tabGroups[group] = "abilities";
         tabs.abilities = { id: "abilities", group, label: "FADE.tabs.abilities" };
      } else {
         // Default tab for first time it"s rendered this session
         if (!this.tabGroups[group] || this.tabGroups[group] === "abilities") this.tabGroups[group] = "items";
      }

      tabs.description = { id: "description", group, label: "FADE.tabs.description" };

      if (this.isCombatVehicle)
         tabs.effects = { id: "effects", group, label: "FADE.tabs.effects" };

      if (this.actor.testUserPermission(game.user, "OWNER")) {
         tabs.items = { id: "items", group, label: "FADE.items" };
         if (actorData.vehicleType == "mount") {
            tabs.skills = { id: "skills", group, label: "FADE.tabs.skills" };
         }
      }

      if (actorData.config.maxSpellLevel > 0) {
         tabs.spells = { id: "spells", group, label: "FADE.tabs.spells" };
      }

      if (game.user.isGM) {
         tabs.gmOnly = { id: "gmOnly", group, label: "FADE.tabs.gmOnly" };
      }

      for (const tab of Object.values(tabs) as any) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }

   static async #clickAttackGroup(event) {
      const dataset = event.target.dataset;
      // @ts-ignore
      const item = this._getItemFromActor(event);
      await item.update({ "system.attacks.group": (item.system.attacks.group + 1) % 6 });
   }
}