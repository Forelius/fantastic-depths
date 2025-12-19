const { DialogV2 } = foundry.applications.api;
import { rollTableDialog } from '../dialog/rollTableDialog.js';
import { CodeMigrate } from "../sys/migration.js";

export class fadeDialog {
   static async getGenericDialog(dataset, caller) {
      const dialogData = {
         label: null,
         formula: null
      };
      let dialogResp = null;

      dialogData.label = dataset.label;
      dialogData.formula = dataset.formula;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/generic-roll.hbs';

      dialogResp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content: await CodeMigrate.RenderTemplate(template, dialogData),
         buttons: [
            {
               action: "roll",
               default: true,
               label: game.i18n.localize('FADE.roll'),
               callback: (event, button, dialog) => new CodeMigrate.FormDataExtended(button.form).object,
            }
         ],
         close: () => { },
         classes: ["fantastic-depths"]
      });
      return dialogResp;
   }

   static async getSelectAttackDialog(equippedOnly = false) {
      // The selected token, not the actor
      let result = null;
      const attackerActor = canvas.tokens.controlled?.[0]?.actor;
      if (attackerActor) {
         const dialogData = {
            label: game.i18n.localize('FADE.dialog.selectAttack'),
            attackItems: null,
            selectedid: null
         };
         const template = 'systems/fantastic-depths/templates/dialog/select-attack.hbs';
         const attackItems = attackerActor.items.filter((item) => item.type === "weapon" && (equippedOnly === false || item.system.equipped) && item.system.quantity !== 0);

         if (!attackItems || attackItems.length == 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('TYPES.Item.weapon') }));
         } else if (equippedOnly && attackItems.length === 0) {
            ui.notifications.warn(game.i18n.localize('FADE.dialog.noEquippedWeapons'));
         } else {
            dialogData.attackItems = attackItems.reduce((acc, item) => {
               acc[item.id] = item.knownNameGM; // Use the "id" as the key and "name" as the value
               return acc;
            }, {});
            dialogData.selectedid = attackItems.find((item) => item.system.equipped)?.id;

            result = await DialogV2.wait({
               window: { title: dialogData.label },
               rejectClose: false,
               content: await CodeMigrate.RenderTemplate(template, dialogData),
               buttons: [
                  {
                     action: "attack",
                     label: game.i18n.localize('FADE.combat.maneuvers.attack.name'),
                     default: true,
                     callback: (event, button, dialog) => new CodeMigrate.FormDataExtended(button.form).object
                  },
                  {
                     action: "close",
                     label: game.i18n.localize('FADE.dialog.close')

                  },
               ],
               close: () => { return null; },
               classes: ["fantastic-depths"]
            });
            //result.context = attackerActor;
            if (result) {
               const item = attackerActor.items.get(result.selectedid);
               // Call item's roll method.
               item.rollAttack();
            }
         }
      } else {
         // Show a warning notification if no token is selected
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
      }

      return result;
   }

   static async getSelectSpellDialog(memorizedOnly = false) {
      const actor = canvas.tokens.controlled?.[0]?.actor;
      if (actor) {
         if (actor.testUserPermission(game.user, "OWNER") == false) {
            console.warn("getSelectSpellDialog called from non-owner.");
            return;
         }
         const dialogData = {
            label: game.i18n.localize('FADE.dialog.selectSpell'),
            spellItems: null
         };
         const template = 'systems/fantastic-depths/templates/dialog/select-spell.hbs';
         const spellItems = actor.items.filter((item) => item.type === "spell")
            .sort((a, b) => a.name.localeCompare(b.name))
            .sort((a, b) => ((b.system.memorized ?? 999) - b.system.cast) - ((a.system.memorized ?? 999) - a.system.cast));

         if (!spellItems || spellItems.length == 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('TYPES.Item.spell') }));
         } else {
            dialogData.spellItems = spellItems.reduce((acc, item) => {
               acc[item.id] = item.name; // Use the "id" as the key and "name" as the value
               return acc;
            }, {});

            const result = await DialogV2.wait({
               window: { title: dialogData.label },
               rejectClose: false,
               position: { width: 460 },
               content: await CodeMigrate.RenderTemplate(template, dialogData),
               buttons: [
                  {
                     action: 'cast',
                     label: game.i18n.localize('FADE.combat.maneuvers.spell.name'),
                     callback: (event, button, dialog) => {
                        return {
                           action: button.dataset?.action,
                           data: new CodeMigrate.FormDataExtended(button.form).object
                        }
                     },
                     default: true
                  },
                  {
                     action: 'view',
                     label: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
                     callback: (event, button, dialog) => {
                        return {
                           action: button.dataset?.action,
                           data: new CodeMigrate.FormDataExtended(button.form).object
                        }
                     }
                  },
                  {
                     action: 'close',
                     label: game.i18n.localize('FADE.dialog.close'),
                     callback: function (event, button, dialog) { return null; }
                  },
               ],
               close: () => { return null; },
               classes: ["fantastic-depths"]
            });

            if (result?.action === 'cast') {
               const item = actor.items.get(result.data.spellItem);
               item.doSpellcast();
            } else if (result?.action === 'view') {
               const item = actor.items.get(result.data.spellItem);
               item.roll({ rollType: "item", skipdlg: true });
            }
         }
      } else {
         // Show a warning notification if no token is selected
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
      }
   }

   static async getYesNoDialog(dataset) {
      const {
         title = game.i18n.localize('FADE.dialog.confirm'),
         content = game.i18n.localize('FADE.dialog.confirm'),
         yesLabel = game.i18n.localize('FADE.dialog.yes'),
         noLabel = game.i18n.localize('FADE.dialog.no'),
         defaultChoice = "no" } = dataset;
      const dialogResp = { resp: null };

      dialogResp.resp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content: `<div style="margin:0 0 8px;">${content}</div>`,
         buttons: [
            {
               action: 'yes',
               label: yesLabel,
               callback: () => ({
                  rolling: true,
                  result: true
               }),
               default: defaultChoice === 'yes'
            },
            {
               action: 'no',
               label: noLabel,
               callback: () => ({
                  rolling: true,
                  result: false
               }),
               default: defaultChoice === 'no'
            }
         ],
         close: () => { return null; },
         classes: ["fantastic-depths"]
      });

      return dialogResp;
   }

   static async getRolltableDialog() {
      const dialog = new rollTableDialog();
      await dialog.getDialog();
   }

   /* Dialog allows player to select a special ability to roll */
   static async getSpecialAbilityDialog() {
      const actor = canvas.tokens.controlled?.[0]?.actor;

      if (!actor) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
         return;
      }

      // Filter items of type 'specialAbility'
      const specialAbilities = actor.items.filter(item => item.type === 'specialAbility' && item.system.category !== 'save')
         .sort((a, b) => a.name.localeCompare(b.name));

      // Check if there are any special abilities
      if (specialAbilities.length === 0) {
         ui.notifications.warn("No special abilities found for the selected actor.");
         return;
      }

      // Create the dialog content
      const content = `
        <form>
            <div class="form-group">
                <label for="abilitySelect">Select Special Ability:</label>
                <select id="abilitySelect" name="abilitySelect">
                    ${specialAbilities.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="modifierInput">Modifier:</label>
                <input type="number" id="modifierInput" name="modifierInput" value="0" />
            </div>
        </form>
    `;

      // Create the dialog using DialogV2
      const result = await DialogV2.wait({
         window: { title: "Roll Special Ability" },
         rejectClose: false,
         position: { width: 400 },
         content: content,
         buttons: [
            {
               action: 'roll',
               label: "Roll",
               callback: (event, button, dialog) => {
                  return {
                     action: button.dataset?.action,
                     data: new CodeMigrate.FormDataExtended(button.form).object
                  }
               },
               default: false
            },
            {
               action: 'cancel',
               label: "Cancel",
               callback: function (event, button, dialog) { return null; },
               default: true
            }
         ],
         close: () => { return null; },
         classes: ["fantastic-depths"]
      });

      if (result?.action === 'roll') {
         const selectedAbilityId = result.data.abilitySelect;
         const selectedAbility = specialAbilities.find(item => item.id === selectedAbilityId);
         const modifier = parseInt(result.data.modifierInput) || 0;

         if (selectedAbility && selectedAbility.roll) {
            // Prepare the dataset
            const dataset = {
               test: 'specialAbility',
               rollType: 'item',
               label: `${selectedAbility.name} ${game.i18n.localize('FADE.SpecialAbility.short')}`
            };

            // Prepare the dialog response
            const dialogResp = {
               mod: modifier, // Include the modifier in the dialog response
               rolling: true
            };

            // Call the roll method with dataset and dialogResp
            await selectedAbility.roll(dataset, dialogResp);
         } else {
            ui.notifications.error("Selected ability does not have a roll method.");
         }
      }
   }
}