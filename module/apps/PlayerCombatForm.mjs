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
      return game.combat.ownedCombatants.map(combatant => combatant.actor?.id).filter(id => id);
   }

   /**
    * Fetch data for the form, such as tracked actors 
    */
   getData() {
      const context = super.getData();
      context.ownedCombatants = game.combat.ownedCombatants;
      return context;
   }

   activateListeners(html) {
      super.activateListeners(html);

      // Listen for changes in the action select elements
      html.find('[name="declaredAction"]').on("change", event => this.#onPlayerChangedAction(event));
      Hooks.on('updateActor', this.#updateTrackedActor);
      Hooks.on("updateCombatant", this.#updateCombatant);
      Hooks.on("updateItem", this.#updateItem);
   }

   // Optionally handle close actions
   close(options) {
      Hooks.off('updateActor', this.#updateTrackedActor);
      Hooks.off("updateCombatant", this.#updateCombatant);
      Hooks.off("updateItem", this.#updateItem);
      delete game.fade.combatForm;
      return super.close(options);
   }

   #updateTrackedActor = (actor, updateData, options, userId) => {
      // Check if the updated actor is in the tracked actors list by ID
      if (game.combat && this.trackedActorIds.includes(actor.id)) {
         this.#updateActorData(actor, updateData);
         console.debug(`Actor ${actor.name} changed.`, updateData);
      }
   };

   #updateCombatant = (combatant, updateData, options, userId) => {
      if (game.combat && this.trackedActorIds.includes(combatant.actor.id)) {
         this.#updateCombatantData(combatant, updateData);
         console.debug(`Combatant ${combatant.name} changed.`, updateData);
      }
   };

   #updateItem = async (item, updateData, options, userId) => {
      const actor = item?.parent; // The actor the item belongs to
      if (game.combat && this.trackedActorIds.includes(actor.id)) {
         this.render();  // Re-render to reflect updated actor data
      }
   };

   #onPlayerChangedAction(event) {
      const actorId = event.currentTarget.dataset.actorId;
      const actor = game.actors.get(actorId);
      const updateData = { "system.combat.declaredAction": event.currentTarget.value };

      // Update the action description dynamically
      this.#updateActorData(actor, updateData);

      // Optionally update the actor's system data if needed
      actor.update(updateData);
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

         if (combat?.attacksAgainst !== undefined) {
            rowElement.querySelector('[name="atnorecv"]').textContent = combat.attacksAgainst;
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
}
