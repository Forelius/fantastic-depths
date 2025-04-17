import { fadeDialog } from './fadeDialog.mjs';
export class SavingThrowDialog extends fadeDialog {
   static async getDialog(dataset, caller) {
      const dialogData = { label: dataset.label };
      const dialogResp = { caller };
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/save-roll.hbs';
      dialogResp.resp = await foundry.applications.api.DialogV2.wait({
         title: title,
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         render: () => fadeDialog.focusById('mod'),
         buttons: [
            {
               action: 'roll',
               label: game.i18n.localize('FADE.roll'),
               callback: (event, button, dialog) => ({
                  rolling: true,
                  mod: parseInt(dialog.querySelector('#mod').value, 10) || 0,
               }),
               default: true
            },
            {
               action: 'magic',
               label: game.i18n.localize('FADE.vsMagic'),
               callback: (event, button, dialog) => ({
                  rolling: true,
                  vsmagic: true,
                  mod: parseInt(dialog.querySelector('#mod').value, 10) || 0,
               })
            }
         ],
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}