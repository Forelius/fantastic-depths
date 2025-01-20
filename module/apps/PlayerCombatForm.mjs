export class PlayerCombatForm extends FormApplication {
   static APP_ID = "party-combat-form";

   constructor() {
      super();
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
      context.availableActions = Object.entries(CONFIG.FADE.CombatManeuvers)
         .map(([key, value]) => ({
            text: game.i18n.localize(`FADE.combat.maneuvers.${key}.name`),
            value: key,
         }))
         .sort((a, b) => a.text.localeCompare(b.text))
         .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {}); // Sort by the `text` property
      return context;
   }

   activateListeners(html) {
      super.activateListeners(html);

      // Listen for changes in the action select elements
      html.find(".declared-action-select").on("change", (event) => {
         const select = event.currentTarget;
         const actorId = select.dataset.actorId;
         const newAction = select.value;

         // Update the action description dynamically
         const descriptionElement = $(select).closest("td").find(".action-description");
         const localizedDescription = game.i18n.localize(`FADE.combat.maneuvers.${newAction}.description`);
         descriptionElement.text(localizedDescription);

         // Optionally update the actor's system data if needed
         const actor = game.actors.get(actorId);
         if (actor) {
            actor.update({ "system.combat.declaredAction": newAction });
         }
      });

      Hooks.on('updateActor', this._updateTrackedActor);
      Hooks.on("updateCombatant", this._updateCombatant);
   }

   toggleInputs(shouldDisable) {
      html.find(".declared-action-select").prop("disabled", shouldDisable);
   }

   // Optionally handle close actions
   close(options) {
      Hooks.off('updateActor', this._updateTrackedActor);
      Hooks.off("updateCombatant", this._updateCombatant);
      return super.close(options);
   }

   _updateTrackedActor = (actor, updateData, options, userId) => {
      // Check if the updated actor is in the tracked actors list by ID
      if (this.trackedActorIds.includes(actor.id)) {
         console.debug(`Actor ${actor.name} changed.`, updateData);
         this.render();  // Re-render to reflect updated actor data
      }
   }

   _updateCombatant = (combatant, updateData, options, userId) => {
      if (this.trackedActorIds.includes(combatant.actor.id)) {
         console.debug(`Combatant ${combatant.name} changed.`, updateData);
      }
   }
}
