const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class UserTablesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor() {
      super();
      this.userTablesSys = game.fade.registry.getSystem('userTables');
      this.system = {
         currentTable: null,
         selectedTable: "none",
      }
   }

   get title() {
      return game.i18n.localize('FADE.apps.userTables.title');
   }

   static TEMPLATES_PATH = 'systems/fantastic-depths/templates/apps/usertables';

   static DEFAULT_OPTIONS = {
      id: 'user-tables-config',
      tag: 'form',
      position: {
         top: 80,
         width: 500
      },
      form: {
         handler: UserTablesConfig.#onSubmit,
         submitOnChange: false,
         closeOnSubmit: false
      },
      actions: {
         addRow: UserTablesConfig.#addRow,
         removeRow: UserTablesConfig.#removeRow
      }
   }

   static PARTS = {
      header: { template: `${UserTablesConfig.TEMPLATES_PATH}/main-header.hbs` },
      editBonus: { template: `${UserTablesConfig.TEMPLATES_PATH}/edit-bonus.hbs` },
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      super._configureRenderOptions(options);
      options.parts = ['header'];

      // The order of `parts` *does* matter. May need to use array manipulation
      if (this.system.currentTable?.type === 'bonus') {
         options.parts.push('editBonus');
      }
      console.log(`_configureRenderOptions:`, options, this.system);
   }

   /** @override */
   async _prepareContext(_options) {
      const context = {};
      console.log(`_prepareContext:`, _options);
      context.system = foundry.utils.deepClone(this.system);
      return context;
   }

   /**
    * Prepare context that is specific to only a single rendered part.
    *
    * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
    * visibility into the data that was used for rendering. It is acceptable to return a different context object
    * rather than mutating the shared context at the expense of this transparency.
    *
    * @param {string} partId                         The part being rendered
    * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
    * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
    * @protected
    */
   async _preparePartContext(partId, context) {
      //context.partId = `${this.id}-${partId}`;
      console.log(`_preparePartContext: ${this.id}-${partId}`);
      if (partId === 'header') {
         const userTables = this.userTablesSys.getTables();
         const tableNames = { none: game.i18n.localize('FADE.apps.userTables.selectTable') };
         Object.assign(tableNames, Object.entries(userTables).reduce((acc, item) => { acc[item[0]] = item[1].name; return acc; }, {}));
         context.tableNames = foundry.utils.deepClone(tableNames);
      }
      return context;
   }

   /**
     * Process form submission for the sheet
     * @this {MyApplication}                      The handler is called with the application as its bound scope
     * @param {SubmitEvent} event                   The originating form submission event
     * @param {HTMLFormElement} form                The form element that was submitted
     * @param {FormDataExtended} formData           Processed data for the submitted form
     * @returns {Promise<void>}
     */
   static async #onSubmit(event, form, formData) {
      const data = foundry.utils.expandObject(formData.object);
      console.log(`#onSubmit: ${event.submitter?.name}`);

      const selectedTable = this.system.selectedTable;
      // Update system with data from form.
      foundry.utils.mergeObject(this.system, data.system);

      if (event.submitter?.name == 'loadTable' && data.system?.selectedTable !== selectedTable) {
         this.#loadTable(data);
      } else if (event.submitter?.name == 'addTable') {
         await this.#addTable(data);
      } else if (event.submitter?.name == 'saveTable') {
         this.#saveTable(data);
      } else if (event.submitter?.name == 'removeTable') {
         await this.#removeTable(data);
      } else if (event.submitter?.name == 'closeTable') {
         this.system.currentTable = null;
         this.system.selectedTable = "none";
      }

      this.render(true);
   }

   async #addTable(data) {
      const tableTypes = game.fade.registry.getSystem("userTables", true).type.TABLE_TYPES
         .map(type => { return { id: type, name: game.i18n.localize(`FADE.apps.userTables.tableTypes.${type}`) } });

      const dialogResp = await foundry.applications.api.DialogV2.wait({
         window: { title: game.i18n.localize('FADE.apps.userTables.actions.createTable') },
         position: { top: 100 },
         content: `<form>
          <div class="form-group">
                <label for="tableId">${game.i18n.localize('FADE.apps.userTables.tableId')}:</label>
                <input name="tableId" type="text" value="new-table" />
            </div>
            <div class="form-group">
                <label for="tableName">${game.i18n.localize('FADE.apps.userTables.tableName')}:</label>
                <input name="tableName" type="text" value="New Table" />
            </div>
            <div class="form-group">
                <label for="tableType">${game.i18n.localize('FADE.apps.userTables.tableType')}:</label>
                 <select id="tableType" name="tableType">
                    ${tableTypes.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
                </select>
            </div>
        </form>`,
         modal: true,
         // This example does not use i18n strings for the button labels,
         // but they are automatically localized.
         buttons: [
            {
               label: "FADE.dialog.cancel",
               action: "cancel",
            },
            {
               label: "FADE.apps.userTables.actions.createTable",
               callback: (event, button, dialog) => new FormDataExtended(button.form).object
            },
         ],
         rejectClose: false,
         close: () => { }
      });

      if (dialogResp != null && dialogResp != 'cancel') {
         console.log('#addTable', dialogResp);
         const table = { id: dialogResp.tableId, name: dialogResp.tableName, type: dialogResp.tableType, table: [] };
         this.userTablesSys.setTable(table);
         this.system.currentTable = table;
         this.system.selectedTable = table.id;
      }
   }

   #loadTable(data) {
      console.log('#loadTable', data);
      const table = foundry.utils.deepClone(this.userTablesSys.getTable(this.system.selectedTable));
      table.table = table.table.sort((a, b) => a.min - b.min);
      this.system.currentTable = table;
   }

   #saveTable(data) {
      console.log('#saveTable', data);
      const table = this.#fixTable(data.system.currentTable.table).sort((a, b) => a.min - b.min);
      this.system.currentTable.table = table;
      this.userTablesSys.setTable(this.system.currentTable);
   }

   async #removeTable(data) {
      const prompt = game.i18n.localize('FADE.apps.userTables.removePrompt');
      const proceed = await foundry.applications.api.DialogV2.confirm({
         window: prompt,
         position: { top: 100 },
         content: `<p>${prompt}</p>`,
         modal: true
      });
      if (proceed) {
         this.userTablesSys.removeTable(data.system.currentTable.id);
         this.system.selectedTable = "none";
         this.system.currentTable = null;
      }
   }

   /**
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
     */
   static #addRow(event, target) {
      if (this.system.currentTable.type === "bonus") {
         this.system.currentTable.table.push({ min: 0, bonus: 0 });
      }
      this.render();
   }

   static #removeRow(event, target) {
      console.log('#removeRow', event, target);
      this.render();
   }

   #fixTable(table) {
      return Object.entries(table).map(row => row[1]);
   }

   static displayForm() {
      if (!game.fade.UserTablesConfig) {
         game.fade.UserTablesConfig = new UserTablesConfig();
      }
      game.fade.UserTablesConfig.render(true);
   }
}
