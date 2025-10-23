const { DialogV2 } = foundry.applications.api;
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

export class AbilityCheckDialog {
   static async getDialog(dataset, caller) {
      let dialogResp = null;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const abilityCheckSys = game.fade.registry.getSystem("abilityCheck");
      const difficultyLevels = game.fade.registry.getSystem("userTables").getKeyValuesJson("difficulty-levels");
      const template = abilityCheckSys.dialogTemplate;
      const templateContent = await CodeMigrate.RenderTemplate(template, {
         difficulty: "medium",
         difficultyLevels: Object.entries(difficultyLevels).reduce((acc, [key, value]) => {
            acc[key] = game.i18n.localize(`FADE.dialog.difficulty.levels.${key}`);
            return acc;
         }, {}),
         ability: dataset.ability,
         formula: dataset.formula
      });

      dialogResp = await DialogV2.wait({
         window: { 
            title: `${caller.name}: ${localizeAbility} ${game.i18n.localize("FADE.roll")}`
         },
         position: {
            width: 300,
            height: "auto"
         },
         rejectClose: false,
         content: templateContent,
         buttons: [
            {
               action: "check",
               label: game.i18n.localize("FADE.dialog.abilityCheck"),
               callback: (event, button, dialog) => new CodeMigrate.FormDataExtended(button.form).object,
               default: true
            },
         ],
         close: () => {},
         classes: ["fantastic-depths"]
      });
      return dialogResp;
   }
}