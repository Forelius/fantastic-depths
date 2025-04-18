const { DialogV2 } = foundry.applications.api;
import { fadeDialog } from './fadeDialog.mjs';

export class AbilityCheckDialog extends fadeDialog {
   static async getDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.ability = dataset.ability;
      dialogData.formula = dataset.formula;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const title = `${caller.name}: ${localizeAbility} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/generic-roll.hbs';

      dialogResp.resp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: 'check',
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: (event, button, dialog) => ({
                  rolling: true,
                  mod: parseInt(dialog.querySelector('#mod').value, 10) || 0,
                  formula: dialog.querySelector('#formula').value || dataset.formula,
               }),
               default: true
            },
         ],
         close: () => { return { rolling: false }; },
         classes: ["fantastic-depths"]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}