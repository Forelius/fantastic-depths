// This function applies the selected theme by adding/removing relevant classes
function applyTheme(theme) {
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
 * Register all of the system's settings.
 */
export function registerSystemSettings() {

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
      }
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
      onChange: value => applyTheme(value)
   });

   // Apply the current theme when the game is initialized
   const currentTheme = game.settings.get(game.system.id, "theme");
   applyTheme(currentTheme);
}
