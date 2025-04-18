import { fadeDialog } from './fadeDialog.mjs';
export class AttackDialog extends fadeDialog {
   /**
    * Display a dialog allowing the caller to select a type of attack and attack roll modifier.
    * @param {any} weapon The attacker's weapon/spell item
    * @param {any} caller The owning actor, the attacker.
    * @param {object} options Additional options:
    *    targetToken: The targetted token
    * @returns
    */
   static async getDialog(weapon, caller, options) {
      const dialogData = { caller };
      const result = {};
      const weaponData = weapon.system;
      const callerName = caller.token?.name || caller.name;
      const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');
      const targetActor = options.targetToken?.actor;

      dialogData.weapon = weaponData;
      dialogData.label = game.user.isGM || weapon.system.isIdentified ? weapon.name : weapon.system.unidentifiedName;
      // Attack type includes melee, missile and breath.
      dialogData.types = weapon.getAttackTypes().reduce((acc, item) => {
         acc[item.value] = item.text; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});

      if (weaponMasterySystem) {
         // Get the available target types.
         dialogData.targetWeaponTypes = weaponMasterySystem.getWeaponTypes(weapon, caller);
         // Determines which target weapon type to pick by default.
         dialogData.selectedWeaponType = weaponMasterySystem.getActorWeaponType(targetActor);
      }

      dialogData.rollGroupName = "rollFormulaType";
      dialogData.rollChoices = {
         normal: "FADE.rollFormulaType.normal",
         advantage: "FADE.rollFormulaType.advantage",
         disadvantage: "FADE.rollFormulaType.disadvantage"
      };
      dialogData.rollChosen = "normal";

      const title = `${callerName}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/attack-roll.hbs';

      result.resp = await foundry.applications.api.DialogV2.wait({
         window: { title: title },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: "check",
               label: game.i18n.localize('FADE.roll'),
               callback: (event, button, dialog) => {
                  const selectedRadio = dialog.querySelector('input[name="rollFormulaType"]:checked')?.value ?? 'normal';
                  let attackRoll = dialog.querySelector('#attackRoll').value ?? '1d20'
                  if (selectedRadio === 'advantage') {
                     attackRoll = `{${attackRoll},${attackRoll}}kh`;
                  } else if (selectedRadio === 'disadvantage') {
                     attackRoll = `{${attackRoll},${attackRoll}}kl`;
                  }
                  return {
                     rolling: true,
                     mod: parseInt(dialog.querySelector('#mod').value, 10) || 0,
                     attackType: dialog.querySelector('#attackType').value,
                     targetWeaponType: dialog.querySelector('#targetWeaponType')?.value,
                     attackRoll,
                     rollFormulaType: selectedRadio.value
                  };
               },
               default: true
            },
         ],
         close: () => { return { rolling: false } }
      });
      result.context = caller;
      return result;
   }

   /**
    * Show the Spell Attack dialog.
    * @param {any} dataset
    * @param {any} caller
    * @param {any} options
    * @returns
    */
   static async getForSpellsDialog(dataset, caller, options) {
      const dialogData = {};
      const dialogResp = { caller };
      const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');

      dialogData.label = dataset.label;

      if (weaponMasterySystem) {
         dialogData.targetWeaponTypes = weaponMasterySystem.getWeaponTypes({ type: "spell" }, caller);
         // Determines which target weapon type to pick by default.
         dialogData.selectedWeaponType = weaponMasterySystem.getActorWeaponType(options.targetToken?.actor);
      }

      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/spell-attack-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         render: () => fadeDialog.focusById('mod'),
         buttons: {
            roll: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  targetWeaponType: document.getElementById('targetWeaponType')?.value,
               }),
            }
         },
         default: 'roll',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}