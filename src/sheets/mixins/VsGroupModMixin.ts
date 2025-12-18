import { CodeMigrate } from "../../sys/migration.js";

/**
 * A mixin for adding VS Group modifier support to an ApplicationV2 class.
 * @param {any} superclass
 * @returns
 */
const VsGroupModMixin = (superclass) => class extends superclass {
   /**
    * Default options for the mixin
    */
   static DEFAULT_OPTIONS: Record<string, unknown> = {
      actions: {
         addVsGroup: this._clickAddVsGroup,
         deleteVsGroup: this._clickDeleteVsGroup
      }
   };

   /**
    * Prepare context data for the sheet
    * @param {object} options - Render options
    * @returns {Promise<object>} The prepared context
    * @protected
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      this._prepareVsGroupContext(context);
      return context;
   }

   /**
    * Prepare context data for VS Group functionality
    * @param {object} context - The context object to modify
    * @protected
    */
   _prepareVsGroupContext(context) {
      // Prepare vsGroup data for actor groups that have been added
      const vsGroupData = [];
      const vsGroupObj = this.item.system.mod.vsGroup || {};
      for (const [groupId, groupData] of Object.entries(vsGroupObj) as any) {
         const group = CONFIG.FADE.ActorGroups.find(g => g.id === groupId);
         if (group) {
            const groupName = game.i18n.localize(`FADE.Actor.actorGroups.${groupId}`);
            vsGroupData.push({ id: groupId, name: groupName, dmg: groupData.dmg || 0, toHit: groupData.toHit || 0, special: groupData.special });
         }
      }
      context.vsGroupData = vsGroupData;
   }

   /**
    * Handle adding a new VS Group modifier
    * @param {Event} event The originating click event
    * @protected
    */
   static async _clickAddVsGroup(event) {
      event.preventDefault();

      // Get available actor groups that aren't already in the vsGroup
      const currentVsGroups = Object.keys(this.item.system.mod.vsGroup || {});
      const availableGroups = CONFIG.FADE.ActorGroups
         .filter(group => !currentVsGroups.includes(group.id))
         .map(group => ({
            value: group.id,
            label: game.i18n.localize(`FADE.Actor.actorGroups.${group.id}`)
         }));

      if (availableGroups.length === 0) {
         ui.notifications.warn("All actor groups are already configured.");
         return;
      }

      // Create dialog to select actor group
      const content = `<form>
            <div class="form-group">
               <label>Select Actor Group:</label>
               <select name="actorGroup">
                  ${availableGroups.map(group =>
         `<option value="${group.value}">${group.label}</option>`
      ).join('')}
               </select>
            </div>
         </form>`;

      const result = await foundry.applications.api.DialogV2.wait({
         window: { title: "Add VS Group Modifier" },
         content,
         rejectClose: false,
         buttons: [
            {
               action: "add",
               label: "Add",
               default: true,
               callback: (event, button, dialog) => {
                  const formData = new CodeMigrate.FormDataExtended(button.form).object;
                  return CONFIG.FADE.ActorGroups.find(i => i.id == formData.actorGroup);
               }
            },
            {
               action: "cancel",
               label: "Cancel",
               callback: () => { }
            }
         ],
         close: () => { },
         classes: ["fantastic-depths"]
      });

      if (result) {
         let updateData = { [`system.mod.vsGroup.${result.id}`]: { dmg: 0, toHit: 0, special: result.special ? "" : null } };
         await this.item.update(updateData);
      }
   }

   /**
    * Handle deleting a VS Group modifier
    * @param {any} event The originating click event
    * @protected
    */
   static async _clickDeleteVsGroup(event) {
      event.preventDefault();

      const groupId = event.target.closest('[data-group-id]').dataset.groupId;
      const updateData = {
         [`system.mod.vsGroup.-=${groupId}`]: null
      };
      await this.item.update(updateData);
   }
}

export { VsGroupModMixin }
