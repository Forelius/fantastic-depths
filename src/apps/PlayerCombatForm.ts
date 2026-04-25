const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PlayerCombatForm extends HandlebarsApplicationMixin(ApplicationV2) {
   static APP_ID = "party-combat-form";

   get title() {
      return game.i18n.localize("FADE.apps.playerCombat.title");
   }

   static DEFAULT_OPTIONS = {
      id: "party-combat-form",
      window: {
         resizable: true,
      },
      position: {
         width: 400,
         height: 400,
      },
      classes: ["fantastic-depths"],
   };

   static PARTS = {
      main: {
         template: `systems/fantastic-depths/templates/apps/player-combat.hbs`,
      },
   };

   get trackedTokenIds() {
      return game.combat?.ownedCombatants.map(combatant => combatant.token?.id).filter(id => id);
   }

   async _prepareContext(_options) {
      return {
         ownedCombatants: game.combat.ownedCombatants,
         heroicMastery: game.settings.get(game.system.id, "weaponMastery") === "heroic",
      };
   }

   _onRender(_context, _options) {
      this.element.querySelectorAll('[name="declaredAction"]').forEach(el => {
         el.addEventListener("change", (event) => this.#onPlayerChangedAction(event));
      });
      Hooks.off('updateActor', this._updateTrackedActor);
      Hooks.on('updateActor', this._updateTrackedActor);
      Hooks.off("updateCombatant", this.#updateCombatant);
      Hooks.on("updateCombatant", this.#updateCombatant);
      Hooks.off("updateItem", this.#updateItem);
      Hooks.on("updateItem", this.#updateItem);
   }

   close(options) {
      Hooks.off('updateActor', this._updateTrackedActor);
      Hooks.off("updateCombatant", this.#updateCombatant);
      Hooks.off("updateItem", this.#updateItem);
      delete game.fade.combatForm;
      return super.close(options);
   }

   _updateTrackedActor = (actor, updateData, _options, _userId) => {
      if (game.combat && this.trackedTokenIds.includes(actor.currentActiveToken?.id)) {
         const rowElement = document.querySelector(`tr[data-actor-id="${actor.id}"]`);
         const combat = updateData.system?.combat;
         if (rowElement) {
            if (updateData.system?.hp?.value !== undefined) {
               const isDead = updateData.system.hp.value <= 0;
               rowElement.classList.toggle('is-dead', isDead);
               rowElement.classList.toggle('alive', !isDead);
            }
            if (combat?.declaredAction !== undefined) {
               const declaredActionEl = rowElement.querySelector('[name="declaredAction"]') as HTMLInputElement | HTMLSelectElement | null;
               if (declaredActionEl) declaredActionEl.value = combat.declaredAction;
               const localizedDescription = game.i18n.localize(`FADE.combat.maneuvers.${combat.declaredAction}.description`);
               rowElement.querySelector('[name="actionDesc"]').textContent = localizedDescription;
            }
            if (combat?.attAgainstH !== undefined) {
               rowElement.querySelector('[name="atnorecvh"]').textContent = combat.attAgainstH;
            }
            if (combat?.attAgainstM !== undefined) {
               rowElement.querySelector('[name="atnorecvm"]').textContent = combat.attAgainstM;
            }
            if (combat?.attacks !== undefined) {
               rowElement.querySelector('[name="atno"]').textContent = combat.attacks;
            }
         }
      }
   };

   async #onPlayerChangedAction(event) {
      const tokenId = event.currentTarget.dataset.tokenId;
      const actor = game.combat.combatants.find(combatant => combatant.token.id === tokenId)?.actor;
      const updateData = { "system.combat.declaredAction": event.currentTarget.value };
      await actor.update(updateData);
   }

   static toggleCombatForm() {
      const declaredActions = game.settings.get(game.system.id, "declaredActions");
      if (!game.combat) {
         ui.notifications.warn(game.i18n.localize('FADE.apps.playerCombat.noCombat'));
      } else if (declaredActions === false) {
         ui.notifications.warn(game.i18n.localize('FADE.apps.playerCombat.noDeclaredActions'));
      } else {
         if (game.fade.combatForm) {
            game.fade.combatForm.close();
         } else {
            game.fade.combatForm = new PlayerCombatForm();
            game.fade.combatForm.render(true);
         }
      }
   }

   #updateCombatant = (combatant, updateData, _options, _userId) => {
      if (game.combat && this.trackedTokenIds.includes(combatant.token?.id)) {
         this.#updateCombatantData(combatant, updateData);
      }
   };

   #updateItem = (item, _updateData, _options, _userId) => {
      const token = item?.parent?.currentActiveToken;
      if (game.combat && token && this.trackedTokenIds.includes(token.id)) {
         this.render();
      }
   };

   #updateCombatantData(combatant, updateData) {
      const rowElement = document.querySelector(`tr[data-token-id="${combatant.token?.id}"]`);
      if (rowElement) {
         if (updateData.initiative !== undefined && game.user.isGM === false) {
            const selectElement = rowElement.querySelector('[name="declaredAction"]');
            if (updateData.initiative !== null) {
               selectElement.setAttribute("disabled", "disabled");
            } else {
               selectElement.removeAttribute("disabled");
            }
         }
      }
   }
}
