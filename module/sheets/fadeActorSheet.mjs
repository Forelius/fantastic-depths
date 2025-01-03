import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { EffectManager } from '../sys/EffectManager.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { fadeItem } from '../item/fadeItem.mjs';
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class fadeActorSheet extends ActorSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/actor';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
         template: `${path}/CharacterSheet.hbs`,
         width: 650,
         height: 540,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'features',
            },
         ],
      });
   }

   /** @override */
   async render(force, options = {}) {
      // Adjust options before rendering based on item type
      options.width = 600;
      options.height = 540;

      // Call the original render method with modified options
      await super.render(force, options);

      // Use setTimeout to allow the DOM to be fully updated before restoring collapsed state
      setTimeout(async () => { await this._restoreCollapsedState(); }, 0);
   }

   /* -------------------------------------------- */

   /** @override */
   async getData() {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = super.getData();

      // Use a safe clone of the actor data for further operations.
      const actorData = this.document.toObject(false);

      // Add the actor's data to context.data for easier access, as well as flags.
      context.system = actorData.system;
      context.flags = actorData.flags;
      context.isSpellcaster = actorData.system.config.maxSpellLevel > 0;

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      context.isBasicEnc = encSetting === "basic";
      context.showCoinWeight = encSetting === "expert" || encSetting === "classic";
      context.isAAC = game.settings.get(game.system.id, "toHitSystem") === "aac";
      context.weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      context.abilityAbbr = game.settings.get(game.system.id, "abilityAbbr");
      context.saveAbbr = game.settings.get(game.system.id, "saveAbbr");

      // Prepare shared actor data and items.
      this._prepareItems(context);

      // Enrich biography info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      context.enrichedBiography = await TextEditor.enrichHTML(
         this.actor.system.biography,
         {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Necessary in v11, can be removed in v12
            async: true,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
         }
      );

      // Prepare active effects
      // A generator that returns all effects stored on the actor as well as any items
      context.effects = EffectManager.prepareActiveEffectCategories(
         this.actor.allApplicableEffects()
         //this.actor.effects
      );

      context.isGM = game.user.isGM;
      context.isOwner = this.actor.testUserPermission(game.user, "OWNER");

      return context;
   }

   getTreasureValue(context) {
      const total = context.treasure.reduce((acc, current) => acc + current.system.totalCost, 0);
      return Math.round(total * 100) / 100;
   }

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Render the item sheet for viewing/editing prior to the editable check.
      html.on('click', '.item-edit', (event) => {
         const item = this._getItemFromActor(event);
         item.sheet.render(true);
      });

      // -------------------------------------------------------------
      // Everything below here is only needed if the sheet is editable
      if (this.isEditable) {
         // Add Inventory Item
         html.on('click', '.item-create', async (event) => { await this._onItemCreate(event) });

         // Delete Inventory Item
         html.on('click', '.item-delete', (event) => {
            const item = this._getItemFromActor(event);
            const li = $(event.currentTarget).parents('.item');
            item.delete();
            li.slideUp(200, () => this.render(false));
         });

         // Active Effect management
         html.on('click', '.effect-control', (event) => {
            const row = event.currentTarget.closest('li');
            const document = row.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(row.dataset.parentId);
            EffectManager.onManageActiveEffect(event, document);
         });

         // Rollable abilities.
         html.on('click', '.rollable', this._onRoll.bind(this));

         // Containers collapse/expand
         html.find(".gear-items .category-caret").click((event) => {
            this._toggleContainedItems(event);
         });

         // Drag events for macros.
         const dragStartHandler = (event) => this._onDragStart(event);
         html.find('li.item').each((i, li) => {
            // If not an inventory header...
            if (li.classList.contains('items-header') == false) {
               li.setAttribute('draggable', true);
               li.addEventListener('dragstart', dragStartHandler, false);
            }
         });

         // Toggle equipped state
         html.find(".item-toggle").click(async (event) => {
            const item = this._getItemFromActor(event);
            // Toggle the equipped state and store the new state in isEquipped
            const isEquipped = !item.system.equipped;
            await item.update({ "system.equipped": isEquipped });
         });

         // Consumables
         html.find(".consumable-counter .full-mark").click((event) => {
            this._useConsumable(event, true);
         });
         html.find(".consumable-counter .empty-mark").click((event) => {
            this._useConsumable(event, false);
         });

         // Editable
         html.find(".editable input").click((event) => event.target.select()).change(this._onDataChange.bind(this));

         // Reset spells
         html.find(".spells .item-reset[data-action='reset-spells']").click((event) => { this._resetSpells(event); });

         // Add/delete tag
         html.find('input[data-action="add-tag"]')
            .keypress((ev) => {
               if (ev.which === 13) {
                  const value = $(ev.currentTarget).val();
                  this.object.tagManager.pushTag(value);
               }
            });
         html.find(".tag-delete").click((ev) => {
            const value = ev.currentTarget.parentElement.dataset.tag;
            this.object.tagManager.popTag(value);
         });

         // Bind the collapsible functionality to the header click event
         html.find('.collapsible-header').on('click', async (event) => {
            // If not the create item column...
            if ($(event.target).closest('.item-create').length === 0) {
               await this._toggleCollapsibleContent(event);
            }
         });
      }
   }

   /**
 * Organize and classify Items for Actor sheets.
 *
 * @param {object} context The context object to mutate
 */
   _prepareItems(context) {
      // Initialize arrays.
      let gear = [];
      const weapons = [];
      const armor = [];
      const skills = [];
      const masteries = [];
      const spellSlots = [];
      const treasure = [];
      const specialAbilities = [];
      const exploration = [];
      const classAbilities = [];

      for (let i = 0; i < 10; i++) {
         spellSlots.push({ spells: [] })
      }

      // Iterate through items, allocating to arrays
      for (let item of context.items) {
         item.img = item.img || Item.DEFAULT_ICON;
         // Append to gear or treasure.
         if (item.type === 'item') {
            // If a contained item...
            if (item.system.containerId?.length > 0) {
               // Check to see if container still exists.
               if (this.actor.items.get(item.system.containerId) === undefined) {
                  // The container does not exist, set containerId to null and add to gear items array
                  item.system.containerId = null;
                  gear.push(item);
               }
            } else {
               gear.push(item);
            }

            if (item.system.tags.includes("treasure")) {
               treasure.push(item);
            }
         }
         // Append to spells.
         else if (item.type === 'spell') {
            if (item.system.spellLevel !== undefined && spellSlots[item.system.spellLevel] !== undefined) {
               spellSlots[item.system.spellLevel].spells.push(item);
            }
         }
         // Append to weapons.
         else if (item.type === 'weapon') {
            weapons.push(item);
         }
         // Append to armor.
         else if (item.type === 'armor') {
            armor.push(item);
         }
         // Append to skills.
         else if (item.type === 'skill') {
            skills.push(item);
         }
         // Append to masteries.
         else if (item.type === 'mastery') {
            masteries.push(item);
         }// Append to specialAbility.
         else if (item.type === 'specialAbility') {
            if (item.system.category === "explore") {
               exploration.push(item);
            } else if (item.system.category === "class") {
               classAbilities.push(item);
            } else {
               specialAbilities.push(item);
            }
         }
      }

      // Add derived data to each item
      gear = gear.map(item => {
         // Attach derived data manually            
         if (item.system.container === true) {
            const citem = context.document.items.get(item._id);
            item.contained = citem?.contained || [];
            item.containedEnc = item.contained?.reduce((sum, item) => {
               const weight = item.system.weight || 0;
               const quantity = item.system.quantity || 1;
               return sum + (weight * quantity);
            }, 0) || 0;
         }
         return item;
      });

      // Assign and return
      context.gear = gear;
      context.weapons = weapons;
      context.armor = armor;
      context.skills = skills;
      context.masteries = masteries;
      context.treasure = treasure;
      context.treasureValue = this.getTreasureValue(context);
      context.spellSlots = spellSlots;
      context.specialAbilities = specialAbilities;
      context.classAbilities = classAbilities;
      context.exploration = exploration;

      this._calcCategoryEnc(context);
   }

   /* -------------------------------------------- */

   /**
    * Calculate encumbrance for different categories.
    * @param {any} context
    */
   _calcCategoryEnc(context) {
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      if (encSetting === 'expert' || encSetting === 'classic') {
         // Gear
         context.gearEnc = context.items
            .filter(item => item.type === 'item')
            .reduce((sum, item) => {
               const itemWeight = item.system.weight || 0;
               const itemQuantity = item.system.quantity || 1;
               return sum + (itemWeight * itemQuantity);
            }, 0);
         // Weapons
         context.weaponsEnc = context.items
            .filter(item => item.type === 'weapon')
            .reduce((sum, item) => {
               return sum + (item.system.weight || 0);
            }, 0);
         // Armor
         context.armorEnc = context.items
            .filter(item => item.type === 'armor')
            .reduce((sum, item) => {
               return sum + (item.system.weight || 0);
            }, 0);
      }
   }

   /**
    * @override
    * @param {any} event
    * @param {any} data
    * @returns
    */
   async _onDropItem(event, data) {
      const targetId = event.target.closest(".item")?.dataset?.itemId;
      const targetItem = this.actor.items.get(targetId);
      const targetIsContainer = targetItem?.system.container;
      const droppedItem = await Item.implementation.fromDropData(data);
      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === 'weaponMastery') {
         //console.warn("Weapon Mastery Definitions can't be added to a character sheet.");
         const actorMastery = droppedItem.createActorWeaponMastery(this.actor);
      }
      // If the drop target is a container...
      else if (droppedItem.type === "item") {
         if (targetIsContainer) {
            const itemData = droppedItem.toObject();
            if (droppedItem.actor == null) {
               const newItem = await this._onDropItemCreate(itemData, event);
               newItem[0].update({ "system.containerId": targetId });
            } else if (droppedItem.actor.id != this.actor.id) {
               const newItem = await this._onDropItemCreate(itemData, event);
               newItem[0].update({ "system.containerId": targetId });
            } else {
               droppedItem.update({ "system.containerId": targetId });
            }
         }
         // The drop target is not a container
         else {
            // If the dropped item is owned by an actor already...
            if (droppedItem.actor !== null) {
               // Remove the item from any container
               droppedItem.update({ "system.containerId": null });
            }
            super._onDropItem(event, data);
         }
      } else if (droppedItem.type !== "class") {
         super._onDropItem(event, data);
      } else {
         this.actor.update({ "system.details.class": droppedItem.name });
         if (this.actor.system.details.level === 0) {
            this.actor.update({ "system.details.level": 1 });
         }
      }
   }

   async _onContainerItemAdd(item, target) {
      const alreadyExistsInActor = target.parent.items.find((i) => i.id === item.id);
      let latestItem = item;
      if (!alreadyExistsInActor) {
         const newItem = await this._onDropItemCreate([item.toObject()]);
         latestItem = newItem.pop();
      }

      const alreadyExistsInContainer = target.system.itemIds.find((i) => i.id === latestItem.id);
      if (!alreadyExistsInContainer) {
         const newList = [...target.system.itemIds, latestItem.id];
         await target.update({ system: { itemIds: newList } });
         await latestItem.update({ system: { containerId: target.id } });
      }
   }

   _getItemFromActor(event) {
      const li = $(event.currentTarget).parents('.item');
      return this.actor.items.get(li.data('itemId'));
   }

   /**
  * @param event
  * @param {bool} decrement
  */
   _useConsumable(event, decrement) {
      const item = this._getItemFromActor(event);
      if (item.type === "weapon") {
         let quantity = item.system.ammo.load;
         item.update({ "system.ammo.load": decrement ? --quantity : ++quantity, });
      } else {
         let quantity = item.system.quantity;
         item.update({ "system.quantity": decrement ? --quantity : ++quantity, });
      }
   }

   /**
    * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
    * @param {Event} event The originating click event
    * @private
    */
   async _onItemCreate(event) {
      event.preventDefault();
      const header = event.currentTarget;
      // Get the type of item to create.
      const type = header.dataset.type;
      // Grab any data associated with this control.
      const data = foundry.utils.duplicate(header.dataset);

      // If tags are specified
      if (header.dataset.tags?.length > 0) {
         data.tags = header.dataset.tags.split(',');
      }

      // Localize the type
      const localizedType = game.i18n.localize(`TYPES.Item.${type}`);

      // Initialize a default name with the localized type, and lowercase it
      const name = `New ${localizedType.toLowerCase()}`;

      // Prepare the item object.
      const itemData = {
         name: name,
         type: type,
         system: data,
      };

      // Remove the type from the dataset since it's in the itemData.type prop.
      delete itemData.system['type'];

      // Finally, create the item!
      return await fadeItem.create(itemData, { parent: this.actor });
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @private
    */
   async _onRoll(event) {
      event.preventDefault();
      event.stopPropagation();

      const elem = event.currentTarget;
      const dataset = elem.dataset;
      let formula = dataset.formula;
      let chatType = null;
      let dialogResp;

      if (dataset.rollType === 'item') {
         // If clicking an item then have item handle roll.
         const li = $(event.currentTarget).parents('.item');
         const item = this.actor.items.get(li.data('itemId'));
         if (item) item.roll(dataset);
      } else if (dataset.test === 'ability') {
         dataset.dialog = dataset.test;
         chatType = CHAT_TYPE.ABILITY_CHECK;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            formula = dialogResp.resp.mod != 0 ? "1d20-@mod" : "1d20";
         }
         // If close button is pressed
         catch (error) {
            chatType = null;
         }
      } else if (dataset.test === "generic") {
         dataset.dialog = dataset.test;
         let title = elem.getAttribute("title");
         if (title) { // Do this because dataset stringifies all properties.
            dataset.desc = title;
         }
         chatType = CHAT_TYPE.GENERIC_ROLL;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            formula = dialogResp.resp.mod != 0 ? (dataset.pass.startsWith("gt") ? `${formula}+@mod` : `${formula}-@mod`) : formula;
         }
         // If close button is pressed
         catch (error) {
            chatType = null;
         }
      } else {
         // Basic roll with roll formula and label
         chatType = CHAT_TYPE.GENERIC_ROLL;
      }

      if (chatType !== null) {
         const rollContext = { ...this.actor.getRollData(), ...dialogResp?.resp || {} };
         let rolled = await new Roll(formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            caller: this.actor,
            context: this.actor,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(chatType, chatData);
         return builder.createChatMessage();
      }

      return false;
   }

   async _onDataChange(event) {
      let result = null;
      event.preventDefault();
      const item = this._getItemFromActor(event);
      if (event.target.dataset.field === "quantity") {
         result = item.update({ "system.quantity": parseInt(event.target.value) });
      } else if (event.target.dataset.field === "cast") {
         result = item.update({ "system.cast": parseInt(event.target.value) });
      }
      else if (event.target.dataset.field === "memorize") {
         result = item.update({ "system.memorized": parseInt(event.target.value) });
      }
      return result;
   }

   async _resetSpells(event) {
      const spells = this.actor.items.filter((item) => item.type === 'spell');
      spells.forEach((spell) => {
         spell.system.cast = 0;
         spell.update({ "system.cast": spell.system.cast });
      });

      const msg = game.i18n.format('FADE.Chat.resetSpells', { actorName: this.actor.name });
      ui.notifications.info(msg);
      // Create the chat message
      await ChatMessage.create({ content: msg });
   }

   /**
    * Toggles the collapsible content based on the isCollapsed state
    * @param {jQuery} $content - The collapsible content to toggle
    * @param {Boolean} isCollapsed - If true, collapse the content; if false, expand the content
    */
   async _toggleContent($parent, skipAnim = false) {
      const children = $parent.find('.collapsible-content');
      const isCollapsed = $(children[0]).hasClass('collapsed');

      if (isCollapsed === true) {
         // Expand the content
         children.each(async function (index, content) {
            let $content = $(content);
            $content.removeClass('collapsed');
            $content.css('height', $content.prop('scrollHeight') + 'px');
            setTimeout(() => { $content.css('height', ''); }, 100); // Adjust to match CSS transition duration
         });
      } else {
         // Collapse the content
         children.each(async function (index, content) {
            let $content = $(content);
            $content.css('height', $content.height() + 'px');
            $content.addClass('collapsed');
            setTimeout(() => { $content.css('height', '0'); }, 0);
         });
      }

      // If remember state is enabled, store the collapsed state
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");
      if (rememberCollapsedState === true) {
         const sectionName = $parent.attr('name'); // Access the `name` attribute from the DOM element
         const actor = game.actors.get(this.actor.id);
         await actor.setFlag(game.system.id, `collapsed-${sectionName}`, !isCollapsed);
      }
   }

   /**
    * Handles the click event for toggling collapsible sections.
    * @param {Event} event - The click event on the collapsible header
    */
   async _toggleCollapsibleContent(event) {
      const $parent = $(event.currentTarget.parentNode); // Get the parent container
      await this._toggleContent($parent);
   }

   async _restoreCollapsedState() {
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");

      if (rememberCollapsedState === true) {
         const actor = game.actors.get(this.actor.id);

         // Retrieve all flags that start with 'collapsed-'
         const flags = actor?.flags[game.system.id] || {};

         Object.keys(flags).forEach(async (key) => {
            // Only process flags that start with 'collapsed-'
            if (key.startsWith('collapsed-') && key !== 'collapsed-undefined') {
               const sectionName = key.replace('collapsed-', ''); // Extract section name
               const isCollapsed = flags[key];
               if (isCollapsed === true) {
                  // Find the collapsible section by the 'name' attribute
                  const parent = document.querySelector(`[name="${sectionName}"]`);
                  if (parent) {
                     await this._toggleContent($(parent), true);
                  }
               }
            } else if (key === 'collapsed-undefined') {
               // Clean up any invalid flags (optional)
               await actor.unsetFlag(game.system.id, key);
               console.warn("Removed invalid flag: collapsed-undefined");
            }
         });
      }
   }

   _toggleContainedItems(event) {
      event.preventDefault();
      const targetItems = $(event.target.closest(".item"));
      const parentId = targetItems[0]?.dataset.itemId;
      if (targetItems?.length > 0) {
         // Find all children of targetItems that has a 
         const items = targetItems.siblings(`[data-item-parentid="${parentId}"]`);
         if (event.target.classList.contains('fa-caret-right')) {
            const el = targetItems.find(".fas.fa-caret-right");
            el.removeClass("fa-caret-right");
            el.addClass("fa-caret-down");
            items.slideDown(200);
         } else {
            const el = targetItems.find(".fas.fa-caret-down");
            el.removeClass("fa-caret-down");
            el.addClass("fa-caret-right");
            items.slideUp(200);
         }
      }
   }
}