import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { EffectManager } from '../sys/EffectManager.mjs';
import { FDItemSheetV2 } from './FDItemSheetV2.mjs';


/**
 * Sheet class for WeaponItem.
 */
export class WeaponItemSheet extends FDItemSheetV2 {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 570,
         height: 400,
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      form: {
         submitOnChange: true
      },
      actions: {
         addVsGroup: WeaponItemSheet.#clickAddVsGroup,
         deleteVsGroup: WeaponItemSheet.#clickDeleteVsGroup
      }
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/weapon/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/weapon/attributes.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/shared/gmOnlyCharge.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ['header', 'tabnav', 'description']

      if (game.user.isGM) {
         options.parts.push('attributes');
         options.parts.push('effects');
         options.parts.push('gmOnly');
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.tabs = this.#getTabs();
      return context;
   }

   async _preparePartContext(partId, context) {
      if (partId === 'header') {
         // Damage types
         const damageTypes = [];
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.physical'), value: 'physical' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.breath'), value: 'breath' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.fire'), value: 'fire' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.frost'), value: 'frost' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.poison'), value: 'poison' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.corrosive'), value: 'corrosive' });
         damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.piercing'), value: 'piercing' });
         context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      } else if (partId === 'attributes') {
         // Weapon types
         const weaponTypes = [];
         weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'), value: 'monster' });
         weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long'), value: 'handheld' });
         weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.all.long'), value: 'all' });
         context.weaponTypes = weaponTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         
         // Prepare vsGroup data for actor groups that have been added
         const vsGroupData = [];
         const vsGroupObj = this.item.system.mod.vsGroup || {};
         for (const [groupId, groupData] of Object.entries(vsGroupObj)) {
            const group = CONFIG.FADE.ActorGroups.find(g => g.id === groupId);
            if (group) {
               const groupName = game.i18n.localize(`FADE.Actor.actorGroups.${groupId}`);
               vsGroupData.push({
                  id: groupId,
                  name: groupName,
                  dmg: groupData.dmg || 0,
                  toHit: groupData.toHit || 0
               });
            }
         }
         context.vsGroupData = vsGroupData;
         context.isGM = game.user.isGM;
         // TODO: Magic damage type  indicates that a different set of parameters is passed to getDamageRoll.
         // This is not a good design, but not addressing it at the moment, so remove this option.
         //context.damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.magic'), value: 'magic' });
         // Weapon sizes
         const weaponSizes = [];
         weaponSizes.push({ text: game.i18n.localize('FADE.none'), value: null });
         weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.S'), value: 'S' });
         weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.M'), value: 'M' });
         weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.L'), value: 'L' });
         context.weaponSizes = weaponSizes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         // Weapon grips/modes
         const weaponGrips = [];
         weaponGrips.push({ text: game.i18n.localize('FADE.none'), value: null });
         weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.oneAbbr'), value: '1H' });
         weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.twoAbbr'), value: '2H' });
         context.weaponGrips = weaponGrips.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         // Saving throws
         const saves = [];
         saves.push({ value: "", text: game.i18n.localize('None') });
         const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
         saves.push(...saveItems.map((save) => {
            return { value: save.system.customSaveCode, text: save.system.shortName }
         }));
         context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      } else if (partId === 'effects') {
         // Prepare active effects for easier access
         context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
      }
      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const group = 'primary';
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = 'description';

      const tabs = {
         description: { id: 'description', group, label: 'FADE.tabs.description' }
      }
      if (game.user.isGM) {
         tabs.attributes = { id: 'attributes', group, label: 'FADE.tabs.attributes' };
         tabs.effects = { id: 'effects', group, label: 'FADE.tabs.effects' };
         tabs.gmOnly = { id: 'gmOnly', group, label: 'FADE.tabs.gmOnly' };
      }

      for (const tab of Object.values(tabs)) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }

   /**
    * Handle adding a new VS Group modifier
    * @param {Event} event The originating click event
    * @private
    */
   static async #clickAddVsGroup(event) {
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
      const content = `
         <form>
            <div class="form-group">
               <label>Select Actor Group:</label>
               <select name="actorGroup">
                  ${availableGroups.map(group => 
                     `<option value="${group.value}">${group.label}</option>`
                  ).join('')}
               </select>
            </div>
         </form>
      `;
      
      const result = await foundry.applications.api.DialogV2.wait({
         window: { title: "Add VS Group Modifier" },
         content,
         buttons: [
            {
               action: "add",
               label: "Add",
               default: true,
               callback: (event, button, dialog) => {
                   const formData = new FormDataExtended(button.form).object;
                   return formData.actorGroup;
                }
            },
            {
               action: "cancel",
               label: "Cancel",
               callback: () => null
            }
         ],
         close: () => null,
         classes: ["fantastic-depths"]
      });
      
      if (result) {
         const updateData = {
            [`system.mod.vsGroup.${result}`]: { dmg: 0, toHit: 0 }
         };
         await this.item.update(updateData);
      }
   }
   
   /**
    * Handle deleting a VS Group modifier
    * @param {Event} event The originating click event
    * @private
    */
   static async #clickDeleteVsGroup(event) {
      event.preventDefault();
      
      const groupId = event.target.closest('[data-group-id]').dataset.groupId;
      const updateData = {
         [`system.mod.vsGroup.-=${groupId}`]: null
      };
      await this.item.update(updateData);
   }
}
