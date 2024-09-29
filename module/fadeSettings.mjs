export class fadeSettings {
   /**
    * Register all of the system's settings.
    */
   registerSystemSettings() {    
      // Encumbrance tracking
      game.settings.register(game.system.id, "encumbrance", {
         name: "SETTINGS.Encumbrance.Name",
         hint: "SETTINGS.Encumbrance.Hint",
         scope: "world",
         config: true,
         default: "normal",
         type: String,
         choices: {
            none: "SETTINGS.Encumbrance.None",
            normal: "SETTINGS.Encumbrance.Normal"
         },
         restricted: true // Only the GM can change this setting
      });

      game.settings.register(game.system.id, "theme", {
         name: "SETTINGS.Theme.Name",
         hint: "SETTINGS.Theme.Hint",
         scope: "client",
         config: true,
         type: String,
         choices: {
            "light": "SETTINGS.Theme.Light",
            "dark": "SETTINGS.Theme.Dark"
         },
         default: "light",
         onChange: value => this.applyTheme(value)
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
            "group": "SETTINGS.initiative.mode.choices.group"
         },
         onChange: value => this.toggleGroupModifier(value)  // Dynamically toggle based on mode
         ,
         restricted: true // Only the GM can change this setting
      });

      // Register the group initiative modifier setting with 'none' as the default
      game.settings.register(game.system.id, "groupInitiativeModifier", {
         name: "SETTINGS.initiative.modifier.name",
         hint: "SETTINGS.initiative.modifier.hint",
         scope: "world",
         config: true,
         default: "none",  // Default is 'No Modifier'
         type: String,
         choices: {
            "none": "SETTINGS.initiative.modifier.choices.none",
            "average": "SETTINGS.initiative.modifier.choices.average",
            "highest": "SETTINGS.initiative.modifier.choices.highest"
         },
         restricted: true // Only the GM can change this setting
      });

      // Register party rest frequency
      game.settings.register(game.system.id, "restFrequency", {
         name: "SETTINGS.rest.name",
         hint: "SETTINGS.rest.hint",
         scope: "world",
         config: true,
         default: 0,  // Default is 0, no rest
         type: Number,
         restricted: true // Only the GM can change this setting
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
            }
         },
         restricted: true // Only the GM can change this setting
      });

      game.settings.register(game.system.id, "rememberCollapsedState", {
         name: "Remember Collapse State",
         hint: "When enabled, the item lists will remember their collapse state individually for each character.",
         scope: "client", // This setting is player-specific
         config: true,
         type: Boolean,
         default: true // Enable by default
      });

      game.settings.register(game.system.id, "logCharacterChanges", {
         name: "Log Character Sheet Changes",
         hint: "If enabled, logs character sheet changes to the GM via chat.",
         scope: "world",
         config: true,
         type: Boolean,
         default: false,
         restricted: true // Only the GM can change this setting
      });

      // Register party rest frequency
      //game.settings.register(game.system.id, "autoNumber", {
      //   name: "SETTINGS.autoNumber.name",
      //   hint: "SETTINGS.autoNumber.hint",
      //   scope: "world",
      //   config: true,
      //   default: false,  // Default is 0, no rest
      //   type: Boolean
      //});
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

   /**
    * Toggles the group initiative modifier setting based on the selected initiative mode.
    * @param {string} value - The value of the initiative mode setting (either 'individual' or 'group').
    */
   toggleGroupModifier(value) {
      const groupModifierSetting = document.querySelector(`select[name="${game.system.id}.groupInitiativeModifier"]`);
      // Set default value to 'none' when disabled
      if (value === "group") {
         groupModifierSetting.disabled = false;  // Enable the setting if group mode is selected

      } else {
         groupModifierSetting.disabled = true;   // Disable the setting if individual mode is selected      
         groupModifierSetting.value = "none";
      }
   }

   renderSettingsConfig(app, html, data) {
      // Select the Initiative Mode dropdown by its name attribute
      const initiativeModeSetting = html.find(`select[name="${game.system.id}.initiativeMode"]`);
      // Select the Initiative Formula input by its name attribute
      const initiativeFormulaInput = html.find(`input[name="${game.system.id}.initiativeFormula"]`);
      // Select the Group Modifier dropdown by its name attribute
      const groupModifierSetting = html.find(`select[name="${game.system.id}.groupInitiativeModifier"]`);

      // Attach a change event listener to the Initiative Mode dropdown
      initiativeModeSetting.change(event => {
         const selectedValue = event.target.value;

         this.toggleGroupModifier(selectedValue);  // Call the function based on the current value

         // Set the initiative formula based on the selected initiative mode
         if (selectedValue === "group") {
            initiativeFormulaInput.val("1d6");  // Set for group mode
         } else {
            initiativeFormulaInput.val("1d20 + @mod");  // Set for individual mode
         }
      });

      // Attach a change event listener to the Group Modifier dropdown
      groupModifierSetting.change(() => {
         if (initiativeModeSetting.val() === "group") {
            if (groupModifierSetting.val() !== "none") {
               initiativeFormulaInput.val("1d6 + @mod");  // Group mode with modifier
            } else {
               initiativeFormulaInput.val("1d6");  // Group mode without modifier
            }
         }
      });

      // Set the initial state when the settings form is rendered
      const currentValue = game.settings.get(game.system.id, "initiativeMode");
      this.toggleGroupModifier(currentValue);
   }
}