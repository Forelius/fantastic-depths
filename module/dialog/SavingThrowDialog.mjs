const { DialogV2 } = foundry.applications.api;

export class SavingThrowDialog {
   static async getDialog(dataset, caller) {
      const dialogData = { label: dataset.label };
      let dialogResp = null;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/save-roll.hbs';
      dialogResp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: 'roll',
               label: game.i18n.localize('FADE.roll'),
               default: true,
               callback: (event, button, dialog) => {
                  return { action: button.dataset.action, ...(new FormDataExtended(button.form).object) }
               }
            },
            {
               action: 'magic',
               label: game.i18n.localize('FADE.vsMagic'),
               callback: (event, button, dialog) => {
                  return { action: button.dataset.action, ...(new FormDataExtended(button.form).object) }
               }
            }
         ],
         close: () => { }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      return dialogResp;
   }
}