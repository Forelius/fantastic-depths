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
      super._onRender(context, options);
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
      const currentTarget = event.currentTarget;
      if ("link" in event.target.dataset) return;
      let dragData;

      // Owned Items
      if (currentTarget.dataset.itemId) {
         const item = this.actor.items.get(currentTarget.dataset.itemId);
         dragData = item.toDragData();
      }

      // Active Effect
      if (currentTarget.dataset.effectId) {
         const effect = this.actor.effects.get(currentTarget.dataset.effectId);
         dragData = effect.toDragData();
      }

      // Set data transfer
      if (dragData) {
         event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      }
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
      const data = TextEditor.getDragEventData(event);
      const actor = this.actor;
      const allowed = Hooks.call("dropActorSheetData", actor, this, data);
      if (allowed === false) return;

      // Handle different data types
      switch (data.type) {
         case "ActiveEffect":
            return this._onDropActiveEffect(event, data);
         case "Actor":
            return this._onDropActor(event, data);
         case "Item":
            return this._onDropItem(event, data);
         case "Folder":
            return this._onDropFolder(event, data);
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
         // TODO: Remove after v12 support.
         const dragDropImp = foundry?.applications?.ux?.DragDrop?.implementation ? foundry.applications.ux.DragDrop.implementation : DragDrop;
         return new dragDropImp(d);
      });
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
      const droppedEffect = await ActiveEffect.implementation.fromDropData(effect);
      const keepId = !this.actor.effects.has(droppedEffect.id);
      await ActiveEffect.create(droppedEffect.toObject(), { parent: this.actor, keepId });
   }

   /**
    * Handle a dropped Actor on the Actor Sheet.
    * @param {DragEvent} event     The initiating drop event
    * @param {Actor} actor         The dropped Actor document
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropActor(event, actor) { }


   /**
    * Handle a dropped Item on the Actor Sheet.
    * @param {DragEvent} event     The initiating drop event
    * @param {Item} item           The dropped Item document
    * @returns {Promise<void>}
    * @protected
    */
   async _onDropItem(event, item) {
      if (!this.actor.isOwner) return;
      const droppedItem = await Item.implementation.fromDropData(item);
      if (this.actor.uuid === droppedItem?.parent?.uuid) return this._onSortItem(event, droppedItem);
      const keepId = !this.actor.items.has(droppedItem.id);
      await Item.create(droppedItem.toObject(), { parent: this.actor, keepId });
   }

   /**
    * Handle dropping of a Folder on an Actor Sheet.
    * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
    * @param {DragEvent} event     The concluding DragEvent which contains drop data
    * @param {object} data         The data transfer extracted from the event
    * @returns {Promise<Item[]>}
    * @protected
    */
   async _onDropFolder(event, data) {
      if (!this.actor.isOwner) return [];
      const folder = await Folder.implementation.fromDropData(data);
      if (folder.type !== "Item") return [];
      const droppedItemData = await Promise.all(folder.contents.map(async item => {
         if (!(document instanceof Item)) item = await fromUuid(item.uuid);
         return item.toObject();
      }));
      return this._onDropItemCreate(droppedItemData);
   }

   /**
    * Handle the final creation of dropped Item data on the Actor.
    * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
    * @param {object[]|object} itemData      The item data requested for creation
    * @returns {Promise<Item[]>}
    * @private
    */
   async _onDropItemCreate(itemData) {
      itemData = itemData instanceof Array ? itemData : [itemData];
      return this.actor.createEmbeddedDocuments("Item", itemData);
   }

   /**
    * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings.
    * @param {DragEvent} event     The initiating drop event
    * @param {Item} item           The dropped Item document
    * @protected
    */
   _onSortItem(event, item) {
      const items = this.actor.items;
      const source = items.get(item.id);

      // Confirm the drop target
      const dropTarget = event.target.closest("[data-item-id]");
      if (!dropTarget) return;
      const target = items.get(dropTarget.dataset.itemId);
      if (source.id === target.id) return;

      // Identify sibling items based on adjacent HTML elements
      const siblings = [];
      for (const element of dropTarget.parentElement.children) {
         const siblingId = element.dataset.itemId;
         if (siblingId && (siblingId !== source.id)) siblings.push(items.get(element.dataset.itemId));
      }

      // Perform the sort
      const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
      const updateData = sortUpdates.map(u => {
         const update = u.update;
         update._id = u.target._id;
         return update;
      });

      // Perform the update
      return this.actor.updateEmbeddedDocuments("Item", updateData);
   }
}

export { DragDropMixin }