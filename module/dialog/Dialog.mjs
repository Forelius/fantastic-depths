function getDialogData() {
   return {
      rollModes: CONFIG.Dice.rollModes,
      rollMode: game.settings.get('core', 'rollMode'),
   };
}

function focusById(id) {
   return setTimeout(() => { document.getElementById(id).focus(); }, 50);
}

export class fadeDialog {
   static async getAbilityDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.ability = dataset.ability;
      const title = `${caller.name}: ${dialogData.ability} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/ability.hbs';

      dialogResp.resp = await Dialog.wait({
         title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {            
            check: {
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: () => ({
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            },
         },
         default: 'check',
      });

      dialogResp.context = caller;
      return dialogResp;
   }
}