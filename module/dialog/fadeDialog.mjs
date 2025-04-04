import { rollTableDialog } from '/systems/fantastic-depths/module/dialog/rollTableDialog.mjs';

export class fadeDialog {
   static focusById(id) {
      return setTimeout(() => { document.getElementById(id).focus(); }, 50);
   }

   static async getGenericDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.label = dataset.label;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/generic-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => fadeDialog.focusById('mod'),
         buttons: {
            roll: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            }
         },
         default: 'roll',
         close: () => { return { rolling: false } }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getSelectAttackDialog(equippedOnly = false) {
      // The selected token, not the actor
      const result = {};
      const attackerActor = canvas.tokens.controlled?.[0]?.actor;
      if (attackerActor) {
         const dialogData = { label: game.i18n.localize('FADE.dialog.selectAttack') };
         const template = 'systems/fantastic-depths/templates/dialog/select-attack.hbs';
         const attackItems = attackerActor.items.filter((item) => item.type === "weapon" && (equippedOnly === false || item.system.equipped) && item.system.quantity !== 0);

         if (!attackItems || attackItems.length == 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('TYPES.Item.weapon') }));
         } else if (equippedOnly && attackItems.length === 0) {
            ui.notifications.warn(game.i18n.localize('FADE.dialog.noEquippedWeapons'));
         } else {
            dialogData.attackItems = attackItems.reduce((acc, item) => {
               acc[item.id] = game.user.isGM || item.system.isIdentified ? item.name : item.system.unidentifiedName; // Use the "id" as the key and "name" as the value
               return acc;
            }, {});
            dialogData.selectedid = attackItems.find((item) => item.system.equipped)?.id;
            result.resp = await Dialog.wait({
               title: dialogData.label,
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: game.i18n.localize('FADE.combat.maneuvers.attack.name'),
                     callback: function (html) {
                        const itemId = document.getElementById('weaponItem').value;
                        const item = attackerActor.items.get(itemId);
                        // Call item's roll method.
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: game.i18n.localize('FADE.dialog.close'),
                     callback: function (html) { return null; }
                  }
               },
               default: "close",
               close: () => { return null; }
            }, {
               classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
            });
            result.context = attackerActor;
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
         const dialogData = { label: game.i18n.localize('FADE.dialog.selectSpell') };
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
            }, {});;
            await Dialog.wait({
               title: dialogData.label,
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: game.i18n.localize('FADE.combat.maneuvers.spell.name'),
                     callback: function (html) {
                        const itemId = document.getElementById('spellItem').value;
                        const item = actor.items.get(itemId);
                        // Call item's roll method.
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: game.i18n.localize('FADE.dialog.close'),
                     callback: function (html) { return null; }
                  }
               },
               default: "close",
               close: () => { return null; }
            }, {
               classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
            });
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
      const dialogResp = {};

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: `<div style="margin:0 0 8px;">${content}</div>`,
         buttons: {
            yes: {
               label: yesLabel,
               callback: () => ({
                  rolling: true,
                  result: true
               })
            },
            no: {
               label: noLabel,
               callback: () => ({
                  rolling: true,
                  result: false
               })
            }
         },
         default: defaultChoice,
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });

      return dialogResp;
   }

   static async getRolltableDialog() {
      const dialog = new rollTableDialog();
      await dialog.getDialog();
   }

   static async getSpecialAbilityDialog() {
      // Get the first selected actor of the player
      const player = game.user;
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
      let content = `
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

      // Create the dialog
      new Dialog({
         title: "Roll Special Ability",
         content: content,
         buttons: {
            roll: {
               label: "Roll",
               callback: async (html) => {
                  const selectedAbilityId = html.find("#abilitySelect").val();
                  const selectedAbility = specialAbilities.find(item => item.id === selectedAbilityId);
                  const modifier = parseInt(html.find("#modifierInput").val()) || 0; // Get the modifier value

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
            },
            cancel: {
               label: "Cancel",
               callback: () => { }
            }
         },
         default: "cancel",
         close: () => { }
      }).render(true);
   }
}