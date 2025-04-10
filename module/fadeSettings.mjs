export class fadeSettings {
   /**
    * Register all of the system's settings.
    */
   async RegisterSystemSettings() {
      await this.#registerConfigSettings();      
      await this.#registerNonConfigSettings();
   }

   async #registerConfigSettings() {
      // Theme
      game.settings.register(game.system.id, "theme", {
         name: "SETTINGS.Theme.Name",
         hint: "SETTINGS.Theme.Hint",
         scope: "client",
         config: true,
         type: String,
         requiresReload: true,
         choices: {
            "light": "SETTINGS.Theme.Light",
            "dark": "SETTINGS.Theme.Dark"
         },
         default: "dark",
         onChange: value => this.applyTheme(value)
      });
      // Actor pack
      game.settings.register(game.system.id, "actorPack", {
         name: "SETTINGS.packs.actorPack",
         scope: "world",   // This means the setting is stored globally for the world
         config: true,     // This makes it appear in the Settings menu
         default: "fade-compendiums.actor-compendium",  
         type: String,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      // Item pack
      game.settings.register(game.system.id, "itemPack", {
         name: "SETTINGS.packs.itemPack",
         scope: "world",   // This means the setting is stored globally for the world
         config: true,     // This makes it appear in the Settings menu
         default: "fade-compendiums.item-compendium",
         type: String,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      // Rolltable pack
      game.settings.register(game.system.id, "rollTablePack", {
         name: "SETTINGS.packs.rollTablePack",
         scope: "world",   // This means the setting is stored globally for the world
         config: true,     // This makes it appear in the Settings menu
         default: "fade-compendiums.roll-table-compendium",
         type: String,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      // Encumbrance tracking
      game.settings.register(game.system.id, "encumbrance", {
         name: "SETTINGS.Encumbrance.Name",
         hint: "SETTINGS.Encumbrance.Hint",
         scope: "world",
         config: true,
         default: "expert",
         type: String,
         requiresReload: true,
         choices: {
            none: "SETTINGS.Encumbrance.None",
            basic: "SETTINGS.Encumbrance.Basic",
            classic: "SETTINGS.Encumbrance.Classic",
            expert: "SETTINGS.Encumbrance.Expert",
         },
         restricted: true // Only the GM can change this setting         
      });
      // Ability score modifier system
      game.settings.register(game.system.id, "abilityScoreModSystem", {
         name: "SETTINGS.abilityScoreModSystem.name",
         hint: "SETTINGS.abilityScoreModSystem.hint",
         scope: "world",
         config: true,
         type: String,
         choices: {
            //"simple": "SETTINGS.abilityScoreModSystem.choices.simple",
            "darkdungeons": "SETTINGS.abilityScoreModSystem.choices.darkdungeons",
         },
         default: "darkdungeons",
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "abilityCheckFormula", {
         name: "SETTINGS.abilityCheckFormula.name",
         scope: "world",   // This means the setting is stored globally for the world
         config: true,     // This makes it appear in the Settings menu
         default: "1d20",  // Default formula, using DEX modifier
         type: String,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "abilityAbbr", {
         name: "SETTINGS.display.abilities.name",
         hint: "SETTINGS.display.abilities.hint",
         scope: "client",
         config: true,
         type: Boolean,         
         default: "true"
      });
      game.settings.register(game.system.id, "saveAbbr", {
         name: "SETTINGS.display.saves.name",
         hint: "SETTINGS.display.saves.hint",
         scope: "client",
         config: true,
         type: Boolean,
         default: "false"
      });
      // Apply the current theme when the game is initialized
      const currentTheme = game.settings.get(game.system.id, "theme");
      this.applyTheme(currentTheme);

      game.settings.register(game.system.id, "initiativeFormula", {
         name: "SETTINGS.initiative.formula.name",
         hint: "SETTINGS.initiative.formula.hint",
         scope: "world",     // This means the setting is stored globally for the world
         config: true,       // This makes it appear in the Settings menu
         default: "1d6",  // Default formula, using DEX modifier
         type: String,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });

      game.settings.register(game.system.id, "initiativeMode", {
         name: "SETTINGS.initiative.mode.name",
         hint: "SETTINGS.initiative.mode.hint",
         scope: "world",
         config: true,
         default: "group",  // Default is individual-based initiative
         type: String,
         choices: {
            "individual": "SETTINGS.initiative.mode.choices.individual",
            "simpleIndividual": "SETTINGS.initiative.mode.choices.simpleIndividual",
            "individualChecklist": "SETTINGS.initiative.mode.choices.individualChecklist",
            "group": "SETTINGS.initiative.mode.choices.group"
         },
         requiresReload: true
      });

      game.settings.register(game.system.id, "nextRound", {
         name: "SETTINGS.initiative.nextRound.name",
         hint: "SETTINGS.initiative.nextRound.hint",
         scope: "world",
         config: true,
         default: "reset",
         type: String,
         choices: {
            "hold": "SETTINGS.initiative.nextRound.choices.hold",
            "reset": "SETTINGS.initiative.nextRound.choices.reset",
            "reroll": "SETTINGS.initiative.nextRound.choices.reroll"
         },
         requiresReload: true,
         restricted: true // Only the GM can change this setting         
      });

      game.settings.register(game.system.id, "declaredActions", {
         name: "SETTINGS.declaredActions.name",
         hint: "SETTINGS.declaredActions.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });

      // Register duration of a round in seconds.
      game.settings.register(game.system.id, "roundDurationSec", {
         name: "SETTINGS.roundDurationSec.name",
         hint: "SETTINGS.roundDurationSec.hint",
         scope: "world",
         config: true,
         default: 10,
         type: Number,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });

      // Register duration of a turn in seconds.
      game.settings.register(game.system.id, "turnDurationSec", {
         name: "SETTINGS.turnDurationSec.name",
         hint: "SETTINGS.turnDurationSec.hint",
         scope: "world",
         config: true,
         default: 600,
         type: Number,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });

      //// Register party rest frequency
      //game.settings.register(game.system.id, "restFrequency", {
      //   name: "SETTINGS.rest.turnsName",
      //   hint: "SETTINGS.rest.turnsNHint",
      //   scope: "world",
      //   config: true,
      //   default: 0,  // Default is 0, no rest
      //   type: Number,
      //   requiresReload: true,
      //   restricted: true // Only the GM can change this setting
      //});

      //// Register party rest frequency
      //game.settings.register(game.system.id, "restCondition", {
      //   name: "SETTINGS.rest.conditionName",
      //   hint: "SETTINGS.rest.conditionHint",
      //   scope: "world",
      //   config: true,
      //   default: "",  // Default is 0, no rest
      //   type: String,
      //   requiresReload: true,
      //   restricted: true // Only the GM can change this setting
      //});

      game.settings.register(game.system.id, "rememberCollapsedState", {
         name: "SETTINGS.collapseState.name",
         hint: "SETTINGS.collapseState.hint",
         scope: "client", // This setting is player-specific
         config: true,
         type: Boolean,
         default: true // Enable by default
      });

      game.settings.register(game.system.id, "logCharacterChanges", {
         name: "SETTINGS.logChanges.name",
         hint: "SETTINGS.logChanges.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: false,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "toasts", {
         name: "SETTINGS.toasts.name",
         hint: "SETTINGS.toasts.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "weaponMastery", {
         name: "SETTINGS.weaponMastery.name",
         hint: "SETTINGS.weaponMastery.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "toHitSystem", {
         name: "SETTINGS.toHitSystem.name",
         hint: "SETTINGS.toHitSystem.hint",
         scope: "world",
         config: true,
         type: String,
         choices: {
            "thac0": "SETTINGS.toHitSystem.choices.thac0",
            "classic": "SETTINGS.toHitSystem.choices.classic",
            "heroic": "SETTINGS.toHitSystem.choices.heroic",
            "darkdungeons": "SETTINGS.toHitSystem.choices.darkdungeons",
            "aac": "SETTINGS.toHitSystem.choices.aac"
         },
         default: "heroic",
         requiresReload: true,
         restricted: true // Only the GM can change this setting
      });
      game.settings.register(game.system.id, "showExplorationTarget", {
         name: "SETTINGS.showExplorationTarget.name",
         hint: "SETTINGS.showExplorationTarget.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         restricted: false
      });
   }

   async #registerNonConfigSettings() {
      game.settings.register(game.system.id, 'partyTrackerData', {
         name: "Party Tracker Data",
         scope: "world",      // This means it's stored for the whole world
         config: false,       // No need to show it in the UI
         type: Object,        // The data type is an object
         default: []          // Default value is an empty array
      });

      await game.settings.register(game.system.id, 'globalEffects', {
         name: 'Global Active Effects',
         scope: 'world',
         config: false,
         type: Array,
         default: [],
      });

      game.settings.register(game.system.id, 'turnData', {
         name: 'Turn Data',  // Name shown in the settings menu
         hint: 'Tracks the turns information.',
         scope: 'world',      // 'world' means it's shared across all users
         config: false,       // Don't show it in the settings menu
         type: Object,        // Data type
         default: {
            dungeon: {
               rest: 0,
               restWarnCount: 0,
               session: 0,
               total: 0
            },
            worldTime: 0
         },
         restricted: true // Only the GM can change this setting
      });

      // Register the systemMigrationVersion setting
      await game.settings.register(game.system.id, "gameVer", {
         name: "System Migration Version",
         hint: "Stores the current version of the system to manage data migrations.",
         scope: "world",  // "world" scope means it's stored at the world level, shared by all users
         config: false,   // Set to false to hide it from the settings UI
         type: String,    // The type of the setting (String, Number, Boolean, etc.)
         default: "0.0.0" // Set a default version, e.g., "0.0.0"
      });
   }

   // This function applies the selected theme by adding/removing relevant classes
   applyTheme(theme) {
      let root = document.documentElement;
      if (theme === "dark") {
         root.classList.add("dark-mode");
         root.classList.remove("light-mode");
      } else {
         root.classList.add("light-mode");
         root.classList.remove("dark-mode");
      }
   }

   renderSettingsConfig(app, html, data) {
      // Select the Initiative Mode dropdown by its name attribute
      const initiativeModeSetting = html.find(`select[name="${game.system.id}.initiativeMode"]`);
      // Select the Initiative Formula input by its name attribute
      const initiativeFormulaInput = html.find(`input[name="${game.system.id}.initiativeFormula"]`);

      // Attach a change event listener to the Initiative Mode dropdown
      initiativeModeSetting.change(event => {
         const selectedValue = event.target.value;

         // Set the initiative formula based on the selected initiative mode
         if (selectedValue === "group") {
            initiativeFormulaInput.val("1d6");  // Set for group mode
         } else {
            initiativeFormulaInput.val("1d20 + @mod");  // Set for individual mode
         }
      });

      // Set the initial state when the settings form is rendered
      const currentValue = game.settings.get(game.system.id, "initiativeMode");
   }
}