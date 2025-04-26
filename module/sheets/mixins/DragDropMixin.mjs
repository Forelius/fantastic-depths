/**
 * A mixin for adding drag and drop support to an ApplicationV2 class.
 * @param {any} superclass
 * @returns
 */
const DragDropMixin = (superclass) => class extends superclass {
   #dragDrop;

   constructor(options = {}) {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();
   }

   /**
    * Returns an array of DragDrop instances
    * @type {DragDrop[]}
    */
   get dragDrop() {
      return this.#dragDrop;
   }

   /**
    * Actions performed after any render of the Application.
    * Post-render steps are not awaited by the render process.
    * @param {ApplicationRenderContext} context      Prepared context data
    * @param {RenderOptions} options                 Provided render options
    * @protected
    */
   _onRender(context, options) {
      this.#dragDrop.forEach((d) => d.bind(this.element));
   }

   /**
    * Define whether a user is able to begin a dragstart workflow for a given drag selector
    * @param {string} selector       The candidate HTML selector for dragging
    * @returns {boolean}             Can the current user drag this selector?
    * @protected
    */
   _canDragStart(selector) {
      // game.user fetches the current user
      return this.isEditable;
   }

   /**
    * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
    * @param {string} selector       The candidate HTML selector for the drop target
    * @returns {boolean}             Can the current user drop on this selector?
    * @protected
    */
   _canDragDrop(selector) {
      // game.user fetches the current user
      return this.isEditable;
   }

   /**
    * Callback actions which occur at the beginning of a drag start workflow.
    * @param {DragEvent} event       The originating DragEvent
    * @protected
    */
   _onDragStart(event) {
      const li = event.currentTarget;
      if ("link" in event.target.dataset) return;
      let dragData;

      // Owned Items
      if (li.dataset.itemId) {
         const item = this.actor.items.get(li.dataset.itemId);
         dragData = item.toDragData();
      }

      // Active Effect
      if (li.dataset.effectId) {
         const effect = this.actor.effects.get(li.dataset.effectId);
         dragData = effect.toDragData();
      }

      // Set data transfer
      if (!dragData) return;
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
   }

   /**
    * Callback actions which occur when a dragged element is over a drop target.
    * @param {DragEvent} event       The originating DragEvent
    * @protected
    */
   _onDragOver(event) { }

   /**
    * Callback actions which occur when a dragged element is dropped on a target.
    * @param {DragEvent} event       The originating DragEvent
    * @protected
    */
   async _onDrop(event) {
      if (super._onDrop) {
         super._onDrop(event);
      } else {
         // Dropped Documents
         const data = TextEditor.getDragEventData(event);
         const documentClass = getDocumentClass(data.type);
         if (documentClass) {
            const document = await documentClass.fromDropData(data);
            await this._onDropDocument(event, document);
         }
      }
   }

   /**
    * Create drag-and-drop workflow handlers for this Application
    * @returns {DragDrop[]}     An array of DragDrop handlers
    * @private
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
         return new DragDrop(d);
      });
   }

   /**
    * Handle a dropped document on the ActorSheet
    * @param {DragEvent} event         The initiating drop event
    * @param {Document} document       The resolved Document class
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropDocument(event, document) {
      switch (document.documentName) {
         case "ActiveEffect":
            return this._onDropActiveEffect(event, /** @type ActiveEffect */ document);
         case "Actor":
            return this._onDropActor(event, /** @type Actor */ document);
         case "Item":
            return this._onDropItem(event, /** @type Item */ document);
         case "Folder":
            return this._onDropFolder(event, /** @type Folder */ document);
      }
   }

   /**
    * Handle a dropped Active Effect on the Actor Sheet.
    * The default implementation creates an Active Effect embedded document on the Actor.
    * @param {DragEvent} event       The initiating drop event
    * @param {ActiveEffect} effect   The dropped ActiveEffect document
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropActiveEffect(event, effect) {
      if (!this.actor.isOwner) return;
      if (!effect || (effect.target === this.actor)) return;
      const keepId = !this.actor.effects.has(effect.id);
      await ActiveEffect.create(effect.toObject(), { parent: this.actor, keepId });
   }

   /**
    * Handle a dropped Actor on the Actor Sheet.
    * @param {DragEvent} event     The initiating drop event
    * @param {Actor} actor         The dropped Actor document
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropActor(event, actor) { }

   /* -------------------------------------------- */

   /**
    * Handle a dropped Item on the Actor Sheet.
    * @param {DragEvent} event     The initiating drop event
    * @param {Item} item           The dropped Item document
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropItem(event, item) {
      if (!this.actor.isOwner) return;
      if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);
      const keepId = !this.actor.items.has(item.id);
      await Item.create(item.toObject(), { parent: this.actor, keepId });
   }

   /* -------------------------------------------- */

   /**
    * Handle a dropped Folder on the Actor Sheet.
    * @param {DragEvent} event     The initiating drop event
    * @param {object} data         Extracted drag transfer data
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropFolder(event, data) { }
}

export { DragDropMixin }