export class PartyTrackerForm extends FormApplication {
   constructor() {
      super();
      this.isGM = game.user.isGM;

      // Load tracked actors from the settings
      let storedData = game.settings.get(game.system.id, 'partyTrackerData') || [];

      // Check if data needs migration (old format: array of objects with `id` properties)
      if (Array.isArray(storedData) && storedData.length > 0 && typeof storedData[0] === "object" && storedData[0].id) {
         console.log("Migrating old party tracker data format to new format (IDs only).");
         // Migrate old data to IDs-only format
         storedData = storedData.map(actor => actor.id);
         // Save the migrated data
         game.settings.set(game.system.id, 'partyTrackerData', storedData);
      }

      // Store the updated tracked actor IDs
      this.trackedActorIds = storedData;
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = "party-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/party-tracker.hbs`;
      options.width = 300;
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

      Hooks.on('updateActor', (actor) => {
         // Check if the updated actor is in the tracked actors list by ID
         if (this.trackedActorIds.includes(actor.id)) {
            this.render();  // Re-render to reflect updated actor data
         }
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

   /** 
    * Clean up hooks when the form is closed 
    */
   async close() {
      super.close();
      Hooks.off('updateActor', this._updateTrackedActor);
   }
}
