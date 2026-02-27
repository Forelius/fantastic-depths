const { DialogV2 } = foundry.applications.api;
import { CodeMigrate } from "../sys/migration.js";

export class SavingThrowDialog {
   static async getDialog(dataset, caller) {
      const dialogData = { label: dataset.label };
      let dialogResp = null;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/save-roll.hbs';

      dialogResp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         modal: true,
         content: await CodeMigrate.RenderTemplate(template, dialogData),
         buttons: [
            {
               action: 'roll',
               label: game.i18n.localize('FADE.roll'),
               default: true,
               callback: (_event, button, _dialog) => {
                  return { action: button.dataset.action, ...(new CodeMigrate.FormDataExtended(button.form).object) }
               }
            },
            {
               action: 'magic',
               label: game.i18n.localize('FADE.vsMagic'),
               callback: (_event, button, _dialog) => {
                  return { action: button.dataset.action, ...(new CodeMigrate.FormDataExtended(button.form).object) }
               }
            }
         ],
         close: () => { }
      }, {
         classes: ["fantastic-depths", ...DialogV2.DEFAULT_OPTIONS.classes]
      });
      return dialogResp;
   }
}