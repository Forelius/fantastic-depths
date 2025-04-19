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
      const el = event.currentTarget;
      if ('link' in event.target.dataset) return;

      // Extract the data you need
      let dragData = null;

      if (!dragData) return;

      // Set data transfer
      event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
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
   async _onDrop(event) { }

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
}

export { DragDropMixin }