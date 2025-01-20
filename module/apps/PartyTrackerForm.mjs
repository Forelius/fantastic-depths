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
      const options = super.defaultOptions;
      options.id = "party-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/party-tracker.hbs`;
      options.width = 350;
      options.height = 500;
      options.resizable = true;
      options.title = "Party Tracker";
      options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
      return options;
   }

   /** 
    * Fetch data for the form, such as tracked actors 
    */
   async getData() {
      const context = super.getData();
      // Fetch actor data dynamically based on stored IDs
      context.trackedActors = this.trackedActorIds.map(id => game.actors.get(id)).filter(actor => actor);
      return context;
   }

   /** 
    * Attach event listeners to elements in the form 
    */
   async activateListeners(html) {
      super.activateListeners(html);

      let dropArea = html.closest('.party-tracker');
      dropArea.on("dragover", event => event.preventDefault());
      dropArea.on("drop", this._onDropActor.bind(this));

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
   async _onDropActor(event) {
      event.preventDefault();

      let data = null;
      let actor = null;

      try {
         data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
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
    * Clean up hooks when the form is closed 
    */
   async close() {
      Hooks.off('updateActor', this._updateTrackedActor);
      super.close();
   }
}
