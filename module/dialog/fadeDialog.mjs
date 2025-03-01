function focusById(id) {
   return setTimeout(() => { document.getElementById(id).focus(); }, 50);
}

export class fadeDialog {
   /**
    * Display a dialog allowing the caller to select a type of attack and attack roll modifier.
    * @param {any} weapon Reference to weapon instance
    * @param {any} caller The owning actor
    * @returns
    */
   static async getAttackDialog(weapon, caller, opt) {
      const dialogData = { caller };
      const result = {};
      const weaponData = weapon.system;

      dialogData.weapon = weaponData;
      dialogData.label = game.user.isGM || weapon.system.isIdentified ? weapon.name : weapon.system.unidentifiedName;
      // Attack mode is how the weapon is held.
      dialogData.modes = weapon.getAttackModes().reduce((acc, item) => {
         acc[item.value] = item.text; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});
      // Attack type includes melee, missile and breath.
      dialogData.types = weapon.getAttackTypes().reduce((acc, item) => {
         acc[item.value] = item.text; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});
      // Get the available target types.
      dialogData.targetWeaponTypes = fadeDialog.getWeaponTypes(weaponData, caller);
      // Determines which target weapon type to pick by default.
      dialogData.selectedWeaponType = opt.targetToken?.actor.getWeaponType();

      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/attack-roll.hbs';

      result.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  attackType: document.getElementById('attackType').value,
                  attackMode: document.getElementById('attackMode').value,
                  targetWeaponType: document.getElementById('targetWeaponType')?.value,
               }),
            },
         },
         default: 'check',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      result.context = caller;
      return result;
   }

   static async getSpellAttackDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.label = dataset.label;
      dialogData.targetWeaponTypes = fadeDialog.getWeaponTypes("spell", caller, dialogData);

      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/spell-attack-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
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

   static getWeaponTypes(weaponData, caller) {
      const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      let result = null;
      // if optional weapon mastery is being used and the weapon has a mastery specified...
      if (weaponMastery) {
         // Get the attacking actor weapon mastery data.
         const attackerMastery = caller.items.find((item) => item.type === 'mastery' && item.name === weaponData?.mastery);
         // If the attacker is a monster, weaponData indicates a spell is being cast or the attacker has a mastery for the weapon being used...
         if (caller.type === "monster" || weaponData === "spell" || attackerMastery) {
            result = {
               monster: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'),
               handheld: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long')
            };
         }
      }
      return result;
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
         render: () => focusById('mod'),
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
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getAbilityDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.ability = dataset.ability;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const title = `${caller.name}: ${localizeAbility} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/ability-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         rejectClose: true,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            },
         },
         default: 'check',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getLightMgrDialog(dataset, caller, opt) {
      const dialogData = {};
      const dialogResp = { caller };
      // Check if there are any items with the "light" tag
      const template = 'systems/fantastic-depths/templates/dialog/lightmgr.hbs';

      dialogData.label = dataset.label;
      dialogData.lightItems = opt.lightItems.reduce((acc, item) => {
         acc[item.id] = item.name; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});;

      dialogResp.resp = await Dialog.wait({
         title: "Light Manager",
         content: await renderTemplate(template, dialogData),
         buttons: {
            ignite: {
               label: game.i18n.localize('FADE.dialog.ignite'),
               callback: (html) => ({
                  action: "ignite",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            extinguish: {
               label: game.i18n.localize('FADE.dialog.extinguish'),
               callback: () => ({
                  action: "extinguish",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            close: {
               label: game.i18n.localize('FADE.dialog.close')
            }
         },
         default: "close",
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getSelectAttackDialog(equippedOnly = false) {
      // The selected token, not the actor
      const result = {};
      const attackerActor = canvas.tokens.controlled?.[0]?.actor || game.user.character;
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
      const casterActor = canvas.tokens.controlled?.[0]?.actor || game.user.character;
      if (casterActor) {
         const dialogData = { label: game.i18n.localize('FADE.dialog.selectSpell') };
         const template = 'systems/fantastic-depths/templates/dialog/select-spell.hbs';
         const spellItems = casterActor.items.filter((item) => item.type === "spell")
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
                        const item = casterActor.items.get(itemId);
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

   static async getSavingThrowDialog(dataset, caller) {
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

      //if (type && type !== "spell" && type !== "breath") {
      buttons.magic = {
         label: game.i18n.localize('FADE.vsMagic'),
         callback: () => ({
            rolling: true,
            vsmagic: true,
            mod: parseInt(document.getElementById('mod').value, 10) || 0,
         })
      };
      //}

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons,
         default: 'roll',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getRolltableDialog() {
      // Get all roll tables and sort them alphabetically by name
      const rollTables = game.tables.contents.sort((a, b) => a.name.localeCompare(b.name));

      // Get roll modes from the Foundry system
      const rollModes = Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => {
         return `<option value="${key}">${game.i18n.localize(value)}</option>`;
      }).join('');

      // Create the dialog content
      let content = `
        <form>
            <div class="form-group">
                <label for="rollTableSelect">Select Roll Table:</label>
                <select id="rollTableSelect" name="rollTableSelect">
                    ${rollTables.map(table => `<option value="${table.id}">${table.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="modifierInput">Modifier:</label>
                <input type="number" id="modifierInput" name="modifierInput" value="0" />
            </div>
            <div class="form-group">
                <label for="rollModeSelect">Select Roll Mode:</label>
                <select id="rollModeSelect" name="rollModeSelect">
                    ${rollModes}
                </select>
            </div>
        </form>
    `;
      console.debug(content);
      // Create the dialog
      new Dialog({
         title: "Roll Table with Modifier",
         content: content,
         buttons: {
            roll: {
               label: "Roll",
               callback: async (html) => {
                  const selectedTableId = html.find("#rollTableSelect").val();
                  const modifier = parseInt(html.find("#modifierInput").val()) || 0;
                  const selectedRollMode = html.find("#rollModeSelect").val();

                  // Get the selected roll table
                  const rollTable = game.tables.get(selectedTableId);
                  if (rollTable) {
                     // Roll the table with the selected roll mode
                     const rollResult = await rollTable.roll();

                     // Calculate the total based on the roll's total and the modifier
                     const rollTotal = rollResult.roll._total;
                     const total = rollTotal + modifier;

                     // Get the text descriptions of the rolled results
                     const rolledResultsText = rollResult.results.map(r => r.text).join(', ');

                     // Create a message to display the result
                     const messageContent = `
                            <h2>${rollTable.name}</h2>
                            <p>${rolledResultsText}</p>
                            <hr/>
                            <p>Total: <strong>${rollTotal} + ${modifier} = ${total}</strong></p>
                        `;
                     const chatMsgData = {
                        content: messageContent,
                        speaker: ChatMessage.getSpeaker()
                     };
                     ChatMessage.applyRollMode(chatMsgData, selectedRollMode);
                     // Send the result to chat
                     ChatMessage.create(chatMsgData);
                  } else {
                     ui.notifications.error("Selected roll table not found.");
                  }
               }
            },
            close: {
               label: "Close",
               callback: () => { }
            }
         },
         default: "close",
         close: () => { }
      }).render(true);
   }

   static async getSpecialAbilityDialog() {
      // Get the first selected actor of the player
      const player = game.user;
      const actor = player.character || (player.actors.length > 0 ? player.actors[0] : null);

      if (!actor) {
         ui.notifications.error("No actor selected or available for the player.");
         return;
      }

      // Filter items of type 'specialAbility'
      const specialAbilities = actor.items.filter(item => item.type === 'specialAbility' && item.system.category !== 'save');

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