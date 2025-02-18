export class PlayerCombatForm extends FormApplication {
   static APP_ID = "party-combat-form";

   constructor(object = {}, options = {}) {
      super(object, options);
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = PlayerCombatForm.APP_ID;
      options.template = `systems/${game.system.id}/templates/apps/player-combat.hbs`;
      options.width = 500;
      options.height = 250;
      options.resizable = true;
      options.title = game.i18n.localize("FADE.apps.playerCombat.title");
      options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
      return options;
   }

   get trackedActorIds() {
      return game.combat?.ownedCombatants.map(combatant => combatant.actor?.id).filter(id => id);
   }

   /**
    * Fetch data for the form, such as tracked actors 
    */
   getData() {
      const context = super.getData();
      context.ownedCombatants = game.combat.ownedCombatants;
      context.useMastery = game.settings.get(game.system.id, "weaponMastery");
      return context;
   }

   /**
    * @override
    * @param {any} html
    */
   activateListeners(html) {
      super.activateListeners(html);
      // Listen for changes in the action select elements
      html.find('[name="declaredAction"]').on("change", this.#onPlayerChangedAction);
      Hooks.on('updateActor', this._updateTrackedActor);
      Hooks.on("updateCombatant", this.#updateCombatant);
      Hooks.on("updateItem", this.#updateItem);
   }

   // Optionally handle close actions
   close(options) {
      Hooks.off('updateActor', this._updateTrackedActor);
      Hooks.off("updateCombatant", this.#updateCombatant);
      Hooks.off("updateItem", this.#updateItem);
      delete game.fade.combatForm;
      return super.close(options);
   }

   _updateTrackedActor = (actor, updateData, options, userId) => {
      // Check if the updated actor is in the tracked actors list by ID
      if (game.combat && this.trackedActorIds.includes(actor.id)) {
         this.#updateActorData(actor, updateData);
      }
   }

   async #onPlayerChangedAction(event) {
      const tokenId = event.currentTarget.dataset.tokenId;
      const actor = game.combat.combatants.find(combatant => combatant.token.id === tokenId)?.actor;
      const updateData = { "system.combat.declaredAction": event.currentTarget.value };
      await actor.update(updateData);
   }

   /**
   * This method is called upon form submission after form data is validated
   * @param {Event} event - The initial triggering submission event
   * @param {object} formData - The object of validated form data with which to update the object
   */
   // eslint-disable-next-line no-underscore-dangle
   async _updateObject(event, formData) {
      event.preventDefault();
   }

   static toggleCombatForm() {
      const declaredActions = game.settings.get(game.system.id, "declaredActions");
      if (game.combat && declaredActions === true) {
         if (game.fade.combatForm) {
            game.fade.combatForm.close();
         } else {
            game.fade.combatForm = new PlayerCombatForm();
            game.fade.combatForm.render(true);
         }
      }
   }

   #updateCombatant = (combatant, updateData, options, userId) => {
      if (game.combat && this.trackedActorIds.includes(combatant.actor.id)) {
         this.#updateCombatantData(combatant, updateData);
      }
   }

   #updateItem = (item, updateData, options, userId) => {
      const actor = item?.parent; // The actor the item belongs to
      if (game.combat && this.trackedActorIds.includes(actor.id)) {
         this.render();  // Re-render to reflect updated actor data
      }
   }

   #updateActorData(actor, updateData) {
      // Find the row matching the actor ID
      const rowElement = document.querySelector(`tr[data-actor-id="${actor.id}"]`);
      const combat = updateData.system?.combat;
      if (rowElement) {
         if (combat?.declaredAction !== undefined) {
            // Update select control value
            rowElement.querySelector('[name="declaredAction"]').value = combat.declaredAction;
            // Update the declared action description
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

   #updateCombatantData(combatant, updateData) {
      // Find the row matching the actor ID
      const rowElement = document.querySelector(`tr[data-actor-id="${combatant.actor.id}"]`);
      if (rowElement) {
         // If initiative changed and this isn't the GM
         if (updateData.initiative !== undefined && game.user.isGM === false) {
            const selectElement = rowElement.querySelector('[name="declaredAction"]');
            if (updateData.initiative !== null) {
               selectElement.setAttribute("disabled", "disabled"); // Add disabled
            } else {
               selectElement.removeAttribute("disabled"); // Remove disabled
            }
         }
      }
   }
}
