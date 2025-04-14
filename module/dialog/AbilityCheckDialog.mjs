import { fadeDialog } from './fadeDialog.mjs';

export class AbilityCheckDialog extends fadeDialog {
   static async getDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.ability = dataset.ability;
      dialogData.formula = dataset.formula;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const title = `${caller.name}: ${localizeAbility} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/ability-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         rejectClose: true,
         content: await renderTemplate(template, dialogData),
         render: () => fadeDialog.focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  formula: document.getElementById('formula').value || dataset.formula,
               }),
            },
         },
         default: 'check',
         close: () => { return { rolling: false }; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}