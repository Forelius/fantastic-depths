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
}
