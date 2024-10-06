export class PartyTrackerForm extends FormApplication {
   constructor() {
      super();
      this.isGM = game.user.isGM;
      // Load tracked actors from the settings
      this.trackedActors = game.settings.get('mySystem', 'partyTrackerData') || [];
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = "party-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/party-tracker.hbs`; // Dynamic path
      options.width = 300;
      options.height = 500;
      options.resizable = true; // Make the form resizable
      options.title = "Party Tracker";
      return options;
   }

   /** 
    * Fetch data for the form, such as tracked actors 
    */
   async getData() {
      const context = super.getData();
      context.trackedActors = this.trackedActors; // Pass tracked actors to the template
      return context;
   }

   /** 
    * Attach event listeners to elements in the form 
    */
   async activateListeners(html) {
      super.activateListeners(html);

      // Make the entire form a drop zone
      let dropArea = html.closest('.party-tracker'); // Make sure we are attaching the events to the whole form

      // Prevent default dragover behavior so the drop works
      dropArea.on("dragover", event => {
         event.preventDefault();
      });

      // Handle the drop event for actors
      dropArea.on("drop", this._onDropActor.bind(this));

      // Attach click event listener for delete buttons
      html.find(".delete-actor").on("click", (event) => {
         const actorId = $(event.currentTarget).closest(".party-member").data("actor-id");
         this._removeTrackedActor(actorId); // Remove the actor
      });

      // Hook into actor updates to make the tracker reactive
      Hooks.on('updateActor', (actor, data, options, userId) => {
         // Check if the updated actor is in the tracked actors list
         if (this.trackedActors.some(a => a.id === actor.id)) {
            this._updateTrackedActor(actor); // Update the actor in the tracker
            this.render();                   // Rerender the tracker
         }
      });
   }

   /** 
   * Update the tracked actor's data in the tracker list 
   */
   _updateTrackedActor(updatedActor) {
      const index = this.trackedActors.findIndex(a => a.id === updatedActor.id);

      if (index !== -1) {
         // Update the actor details in the trackedActors array
         this.trackedActors[index] = {
            id: updatedActor.id,
            name: updatedActor.name,
            system: updatedActor.system // Update with the new system data
         };
      }
   }

   /** 
    * Handle the drop event for actors 
    */
   async _onDropActor(event) {
      event.preventDefault();

      // Step 1: Extract the data from the drop event
      let data = null;
      let actor = null;
      let isValid = true;

      // Try parsing the data
      try {
         data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      } catch (err) {
         console.error("Failed to parse drop data:", err);
         isValid = false;  // Mark as invalid
      }

      // Step 2: Validate the drop data type and check if the UUID is available
      if (isValid && data.type !== "Actor") {
         console.error("Dropped data is not an actor.");
         isValid = false;
         ui.notifications.warn("Only actors can be dropped onto the party tracker.");
      } else if (isValid && !data.uuid) {
         console.error("Actor data is missing a UUID.");
         isValid = false;
      }

      // Step 3: Try to retrieve the actor using the UUID
      if (isValid) {
         try {
            actor = await fromUuid(data.uuid); // Use fromUuid to get the actor
            if (!actor || actor.documentName !== "Actor") {
               console.error("Failed to retrieve an actor from the UUID:", data.uuid);
               isValid = false;
            }
         } catch (err) {
            console.error("Error retrieving actor from UUID:", err);
            isValid = false;
         }
      }

      // Step 4: Check if the actor is already in the tracked list
      let isAlreadyTracked = false;
      if (isValid) {
         isAlreadyTracked = this.trackedActors.some(a => a.id === actor.id);
      }

      // Step 5: Process based on validity
      if (isValid && !isAlreadyTracked) {
         console.log("Adding actor:", actor.name);

         // Extract actor details safely and push to the tracked list
         const actorDetails = {
            id: actor.id,
            name: actor.name,
            system: actor.system
         };

         this.trackedActors.push(actorDetails);
         this._saveTrackedActors();  // Save the updated list to settings

         // Re-render the form to display the updated list
         this.render();
      } else if (isAlreadyTracked) {
         console.log("Actor is already being tracked:", actor.name);
      } else {
         console.warning("Could not add actor due to invalid data.");
      }
   }

   _removeTrackedActor(actorId) {
      // Remove the actor from the trackedActors array
      this.trackedActors = this.trackedActors.filter(a => a.id !== actorId);

      // Save the updated list to settings
      this._saveTrackedActors();

      // Re-render the form
      this.render();
   }

   _saveTrackedActors() {
      game.settings.set('mySystem', 'partyTrackerData', this.trackedActors);
   }

   /** 
    * Clean up hooks when the form is closed 
    */
   async close() {
      super.close();
      Hooks.off('updateActor', this._updateTrackedActor);
   }
}
