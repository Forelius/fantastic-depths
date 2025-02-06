import { AwardXPDialog } from "./AwardXPDialog.mjs"
export class PartyTrackerForm extends FormApplication {
   constructor(object = {}, options = {}) {
      super(object, options);
      this.isGM = game.user.isGM;

      // Load tracked actors from the settings
      let storedData = game.settings.get(game.system.id, 'partyTrackerData') || [];

      // Store the updated tracked actor IDs
      this.trackedActorIds = storedData;
   }

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: "party-tracker-form",
         title: "Party Tracker",
         classes: ["fantastic-depths", ...super.defaultOptions.classes],
         template: `systems/${game.system.id}/templates/apps/party-tracker.hbs`,
         width: 350,
         height: 500,
         resizable: true,
         dragDrop: [
            { dragSelector: ".actor-list .actor", dropSelector: ".party-tracker" },
         ],
         closeOnSubmit: false,
      });
   }

   /** 
    * Fetch data for the form, such as tracked actors 
    */
   async getData() {
      const context = await super.getData();
      // Fetch actor data dynamically based on stored IDs
      context.trackedActors = this.trackedActorIds.map(id => game.actors.get(id)).filter(actor => actor);
      return context;
   }

   /** 
    * Attach event listeners to elements in the form 
    */
   activateListeners(html) {
      super.activateListeners(html);

      html.find(".delete-actor").on("click", (event) => {
         const actorId = $(event.currentTarget).closest(".party-member").data("actor-id");
         this._removeTrackedActor(actorId);
      });

      Hooks.on('updateActor', this._updateTrackedActor);

      // **New**: Double-click on a party member to open their actor sheet
      html.find(".party-member").on("dblclick", (event) => {
         const actorId = $(event.currentTarget).data("actor-id");
         const actor = game.actors.get(actorId);
         if (!actor) return;
         actor.sheet.render(true);
      });

      // **New**: Open "Award XP" dialog
      html.find(".award-xp-button").on("click", (event) => {
         new AwardXPDialog({}, { actorIds: this.trackedActorIds }).render(true);
      });
   }

   /** 
    * Handle the drop event for actors 
    */
   async _onDrop(event) {
      event.preventDefault();

      let data = null;
      let actor = null;

      try {
         data = JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch (err) {
         console.error("Failed to parse drop data:", err);
         ui.notifications.warn("Invalid data dropped.");
         return;
      }

      if (data.type !== "Actor" || !data.uuid) {
         console.error("Dropped data is not a valid actor.");
         ui.notifications.warn("Only actors can be dropped onto the party tracker.");
         return;
      }

      try {
         actor = await fromUuid(data.uuid);
         if (!actor || actor.documentName !== "Actor") {
            console.error("Failed to retrieve an actor from the UUID:", data.uuid);
            return;
         }
      } catch (err) {
         console.error("Error retrieving actor from UUID:", err);
         return;
      }

      // Check if the actor is already tracked by ID
      if (this.trackedActorIds.includes(actor.id)) {
         console.log("Actor is already being tracked:", actor.name);
         return;
      }

      // Add the actor's ID to the tracked list
      this.trackedActorIds.push(actor.id);
      this._saveTrackedActors();  // Save the updated list to settings
      this.render();  // Re-render the form to display the updated list
   }

   _removeTrackedActor(actorId) {
      // Remove the actor ID from the tracked IDs array
      this.trackedActorIds = this.trackedActorIds.filter(id => id !== actorId);
      this._saveTrackedActors();
      this.render();  // Re-render the form
   }

   _saveTrackedActors() {
      game.settings.set(game.system.id, 'partyTrackerData', this.trackedActorIds);
   }

   _updateTrackedActor = (actor) => {
      // Check if the updated actor is in the tracked actors list by ID
      if (this.trackedActorIds.includes(actor.id)) {
         this.render();  // Re-render to reflect updated actor data
      }
   };

   /**
    * This method is called upon form submission after form data is validated
    * @param {Event} event - The initial triggering submission event
    * @param {object} formData - The object of validated form data with which to update the object
    */
   // eslint-disable-next-line no-underscore-dangle
   async _updateObject(event, formData) {
      event.preventDefault();
      // Update the actor
      //await this.object.update(formData);
      //// Re-draw the updated sheet
      //// eslint-disable-next-line no-underscore-dangle
      //await this.object.sheet._render(true);
   }

   /** 
    * Clean up hooks when the form is closed 
    */
   async close() {
      Hooks.off('updateActor', this._updateTrackedActor);
      super.close();
   }
}
