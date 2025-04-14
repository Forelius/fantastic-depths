import { fadeDialog } from './fadeDialog.mjs';
export class SavingThrowDialog extends fadeDialog {
   static async getDialog(dataset, caller) {
      const dialogData = { label: dataset.label };
      const dialogResp = { caller };
      const type = dataset.type;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/save-roll.hbs';
      const buttons = {
         roll: {
            label: game.i18n.localize('FADE.roll'),
            callback: () => ({
               rolling: true,
               mod: parseInt(document.getElementById('mod').value, 10) || 0,
            })
         }
      };

      buttons.magic = {
         label: game.i18n.localize('FADE.vsMagic'),
         callback: () => ({
            rolling: true,
            vsmagic: true,
            mod: parseInt(document.getElementById('mod').value, 10) || 0,
         })
      };

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => fadeDialog.focusById('mod'),
         buttons,
         default: 'roll',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}