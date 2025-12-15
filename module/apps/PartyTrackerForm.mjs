const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { AwardXPDialog } from "./AwardXPDialog.mjs"

export class PartyTrackerForm extends HandlebarsApplicationMixin(ApplicationV2) {
   #dragDrop;

   constructor(object = {}, options = {}) {
      super(object, options);
      this.isGM = game.user.isGM;

      // Load tracked actors from the settings
      let storedData = game.settings.get(game.system.id, 'partyTrackerData') || [];

      // Store the updated tracked actor IDs
      this.trackedActorIds = storedData;
      this.#dragDrop = this.#createDragDropHandlers();
   }

   get title() {
      return "Party Tracker";
   }

   static DEFAULT_OPTIONS = {
      id: "party-tracker-form",
      tag: 'form',
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      position: {
         width: 280,
         height: 450,
      },
      form: {
         handler: PartyTrackerForm.#onSubmit,
         submitOnChange: false,
         closeOnSubmit: false
      },
      actions: {
         deleteActor: PartyTrackerForm.#deleteActor,
         awardXP: PartyTrackerForm.#awardXP,
      },
      classes: ['fantastic-depths'],
      dragDrop: [{ dragSelector: "[data-document-id]", dropSelector: "form" }]
   }

   static PARTS = {
      main: {
         template: `systems/fantastic-depths/templates/apps/party-tracker.hbs`,
      }
   }

   /** 
    * Fetch data for the form, such as tracked actors 
    */
   async _prepareContext(_options) {
      const context = {};
      // Fetch actor data dynamically based on stored IDs
      context.trackedActors = this.trackedActorIds.map(id => game.actors.get(id)).filter(actor => actor);

      // get total party level
      context.tpl = this.getTotalPartyLevel();

      return context;
   }

   /**
    * Returns the total party level (TPL), which is the sum of all experience levels of all the characters
    * in the party, when at max hp.
    * @returns
    */
   getTotalPartyLevel() {
      const trackedActors = this.trackedActorIds.map(id => game.actors.get(id)).filter(actor => actor);
      const classSystem = game.fade.registry.getSystem("classSystem");
      const result = trackedActors.reduce((acc, actor) => {
         const highestLevel = classSystem.getHighestLevel(actor) ?? 1;
         return highestLevel + acc;
      }, 0);
      return result;
   }

   /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {any} context      Prepared context data
   * @param {any} options                 Provided render options
   * @protected
   */
   _onRender(context, options) {
      if (game.user.isGM) {
         Hooks.off('updateActor', this._updateTrackedActor);
         Hooks.on('updateActor', this._updateTrackedActor);

         // Bind drag and drop handlers
         this.#dragDrop.forEach((d) => d.bind(this.element));

         // Add double-click listener for opening actor sheets
         this.element.querySelectorAll(".party-member").forEach(element => {
            element.addEventListener("dblclick", (event) => {
               const actorId = event.currentTarget.dataset.actorId;
               const actor = game.actors.get(actorId);
               if (!actor) return;
               actor.sheet.render(true);
            });
         });
      }
   }

   /**
    * Define whether a user is able to begin a dragstart workflow for a given element
    * @param {string} selector       The candidate HTML selector for dragging
    * @returns {boolean}             Can the current user drag this element?
    * @protected
    */
   _canDragStart(selector) {
      return game.user.isGM;
   }

   /**
    * Define whether a user is able to conclude a drag-and-drop workflow for a given element
    * @param {string} selector       The candidate HTML selector for the drop target
    * @returns {boolean}             Can the current user drop on this element?
    * @protected
    */
   _canDragDrop(selector) {
      return game.user.isGM;
   }

   /** 
    * Handle the drop event for actors 
    */
   async _onDrop(event) {
      const data = TextEditor.getDragEventData(event);

      if (data.type !== "Actor" || !data.uuid) {
         console.error("Dropped data is not a valid actor.");
         ui.notifications.warn("Only actors can be dropped onto the party tracker.");
         return;
      }

      let actor;
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
   async _updateObject(event, formData) {
      event.preventDefault();
      // Handle any form data updates if needed
   }

   /** 
    * Clean up hooks when the form is closed 
    */
   close(options) {
      Hooks.off('updateActor', this._updateTrackedActor);
      return super.close(options);
   }


   /**
    * Process form submission for the sheet
    * @this {PartyTrackerForm}             The handler is called with the application as its bound scope
    * @param {SubmitEvent} event            The originating form submission event
    * @param {HTMLFormElement} form         The form element that was submitted
    * @param {any} formData    Processed data for the submitted form
    * @returns {Promise<void>}
    */
   static async #onSubmit(event, form, formData) {
      event.preventDefault();
      // Handle form submission if needed
   }

   /**
    * Handle delete actor action
    * @param {any} event - The click event
    */
   static async #deleteActor(event) {
      event.preventDefault();
      const actorId = event.target.closest(".party-member").dataset.actorId;
      this._removeTrackedActor(actorId);
   }

   /**
    * Handle award XP action
    * @param {Event} event - The click event
    */
   static async #awardXP(event) {
      event.preventDefault();
      new AwardXPDialog({}, { actorIds: this.trackedActorIds }).render(true);
   }

   /**
    * Create drag-and-drop workflow handlers for this Application
    * @returns {any[]}     An array of DragDrop handlers
    */
   #createDragDropHandlers() {
      return this.options.dragDrop.map((d) => {
         d.permissions = {
            dragstart: this._canDragStart.bind(this),
            drop: this._canDragDrop.bind(this),
         };
         d.callbacks = {
            dragstart: this._onDragStart.bind(this),
            dragover: this._onDragOver.bind(this),
            drop: this._onDrop.bind(this),
         };
         // TODO: Remove after v12 support.
         const dragDropImp = foundry?.applications?.ux?.DragDrop?.implementation ? foundry.applications.ux.DragDrop.implementation : DragDrop;
         return new dragDropImp(d);
      });
   }

   /**
    * Callback actions which occur at the beginning of a drag start workflow.
    * @param {DragEvent} event       The originating DragEvent
    * @protected
    */
   _onDragStart(event) {
      // For party tracker, we don't need to handle drag start since we only accept drops
   }

   /**
    * Callback actions which occur when a dragged element is over a drop target.
    * @param {DragEvent} event       The originating DragEvent
    * @protected
    */
   _onDragOver(event) {
      // Default behavior is fine
   }
}
