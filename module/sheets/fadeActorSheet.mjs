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
      const context = await super.getData();

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
      context.sizes = CONFIG.FADE.ActorSizes
         .map((size) => { return { text: game.i18n.localize(`FADE.Actor.sizes.${size.id}`), value: size.id } })
         .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

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
         html.on('click', '.effect-control', async (event) => {
            const row = event.currentTarget.closest('li');
            const document = row.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(row.dataset.parentId);
            await EffectManager.onManageActiveEffect(event, document);
         });

         // Rollable abilities.
         html.on('click', '.rollable, .chatable', this._onRoll.bind(this));

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
         html.find(".item-toggle").click(async (event) => await this._toggleEquippedState(event));

         // Consumables
         html.find(".consumable-counter .full-mark").click(async (event) => {
            await this._useConsumable(event, true);
         });
         html.find(".consumable-counter .empty-mark").click(async (event) => {
            await this._useConsumable(event, false);
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
      const savingThrows = [];

      for (let i = 0; i < this.actor.system.config.maxSpellLevel; i++) {
         spellSlots.push({ spells: [] })
      }

      // Iterate through items, allocating to arrays
      for (let item of context.items) {
         const docItem = context.document.items.get(item._id);
         item.img = item.img || Item.DEFAULT_ICON;
         // Append to gear or treasure.
         if (item.type === 'item' || item.type === 'light') {
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
            // TODO: Remove tag, not localizable.
            if (item.system.tags.includes("treasure")) {
               treasure.push(item);
            }
         }
         // Append to spells.
         else if (item.type === 'spell') {
            const spellLevel = Math.max(0, item.system.spellLevel - 1);
            if (item.system.spellLevel !== undefined && spellSlots?.length >= item.system.spellLevel) {
               spellSlots[spellLevel].spells.push(item);
            } else {
               console.warn(`Not able to add spell ${item.name} of level ${item.system.spellLevel} to ${this.actor.name}. Caster only has ${spellSlots.length} spell slot(s).`);
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
            } else if (item.system.category === "save") {
               savingThrows.push(item);
            } else {
               specialAbilities.push(item);
            }
         }
      }

      function mapContainer(item) {
         // Attach derived data manually            
         if (item.system.container === true) {
            const docItem = context.document.items.get(item._id);
            for (let innerItem of docItem?.containedItems) {
               mapContainer(innerItem);
            }
            item.contained = docItem?.containedItems || [];
            item.containedEnc = docItem?.totalEnc || 0;
         }
         return item;
      }
      // Add derived data to each item
      gear = gear.map(mapContainer);

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
      context.savingThrows = savingThrows;

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
            .filter(item => item.type === 'item' || item.type === 'light')
            .reduce((sum, item) => {
               const itemWeight = item.system.weight || 0;
               const itemQuantity = item.system.quantity || 1;
               //const citem = context.document.items.get(item._id);
               //console.debug(item.name, citem.totalEnc);
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
      const itemParentid = event.target.closest(".item")?.dataset?.itemParentid;
      const targetItem = this.actor.items.get(targetId);
      const targetIsContainer = targetItem?.system.container;
      const droppedItem = await Item.implementation.fromDropData(data);
      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === 'weaponMastery') {
         //console.warn("Weapon Mastery Definitions can't be added to a character sheet.");
         const actorMastery = droppedItem.createActorWeaponMastery(this.actor);
      }
      // If the drop target is a container...
      else if (droppedItem.type === "item" || droppedItem.type === "light") {
         if (targetIsContainer && droppedItem.system.containerId !== targetId && targetId !== droppedItem.id) {
            const itemData = droppedItem.toObject();
            if (droppedItem.actor == null) {
               const newItem = await this._onDropItemCreate(itemData, event);
               await newItem[0].update({ "system.containerId": targetId });
            } else if (droppedItem.actor.id != this.actor.id) {
               const newItem = await this._onDropItemCreate(itemData, event);
               await newItem[0].update({ "system.containerId": targetId });
            } else {
               await droppedItem.update({ "system.containerId": targetId });
            }
         }
         // The drop target is not a container
         else {
            // If the dropped item is owned by an actor already...
            if (droppedItem.actor !== null) {
               // Remove the item from any container
               await droppedItem.update({ "system.containerId": null });
            }
            super._onDropItem(event, data);
         }
      } else if (droppedItem.type === "class") {
         await this.actor.update({ "system.details.class": droppedItem.name });
         if (this.actor.system.details.level === 0) {
            await this.actor.update({ "system.details.level": 1 });
         }
      } else if (droppedItem.type === 'effect') {

      }
      else {
         super._onDropItem(event, data);
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

   /**
    * Retrieves an item owned by the actor based on parent element's data-item-id.
    * @param {any} event
    * @returns 
    */
   _getItemFromActor(event) {
      const li = $(event.currentTarget).parents('.item');
      return this.actor.items.get(li.data('itemId'));
   }

   /**
  * @param event
  * @param {bool} decrement
  */
   async _useConsumable(event, decrement) {
      const item = this._getItemFromActor(event);
      let quantity = item.system.quantity;
      await item.update({ "system.quantity": decrement ? --quantity : ++quantity, });
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
         // Directly roll item and skip the rest
         if (item) await item.roll(dataset);
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
      } else if (dataset.test === 'save') {
         this.actor.rollSavingThrow(dataset.type);
      } else if (dataset.test === "generic") {
         dataset.dialog = dataset.test;
         const title = elem.getAttribute("title");
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
         const rolled = await new Roll(formula, rollContext).evaluate();
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

   /**
    * Event handler for editable item fields.
    * @param {any} event
    * @returns
    */
   async _onDataChange(event) {
      let result = null;
      event.preventDefault();
      const item = this._getItemFromActor(event);
      const newVal = event.target.value === '' ? null : Number(event.target.value);
      if (event.target.dataset.field === "quantity") {
         result = await item.update({ "system.quantity": newVal ?? 0 });
      } else if (event.target.dataset.field === "cast") {
         result = await item.update({ "system.cast": newVal ?? 0 });
      } else if (event.target.dataset.field === "memorized") {
         result = await item.update({ "system.memorized": newVal });
      } else if (event.target.dataset.field === "target") {
         result = await item.update({ "system.target": newVal ?? 0 });
      }

      return result;
   }

   async _resetSpells(event) {
      const spells = this.actor.items.filter((item) => item.type === 'spell');
      spells.forEach(async (spell) => {
         spell.system.cast = 0;
         await spell.update({ "system.cast": spell.system.cast });
      });

      const msg = game.i18n.format('FADE.Chat.resetSpells', { actorName: this.actor.name });
      ui.notifications.info(msg);
      // Create the chat message
      await ChatMessage.create({ content: msg });
   }

   /**
 * Handles the click event for toggling collapsible sections.
 * @param {Event} event - The click event on the collapsible header
 */
   async _toggleCollapsibleContent(event) {
      await this._toggleContent($(event.currentTarget));
   }

   /**
    * Toggles the collapsible content based on the isCollapsed state.
    * This method is separate from the event handler because it is also called to restore expanded state when opening the sheet.
    * @param {any} target The clicked element as a jquery object.
    */
   async _toggleContent(target) {
      const collapsibleItems = target.siblings('.collapsible-content');
      const isCollapsed = $(collapsibleItems[0]).hasClass('collapsed');

      if (isCollapsed === true) {
         // Expand the content
         collapsibleItems.each(async (index, content) => {
            let $content = $(content);
            $content.removeClass('collapsed');
            $content.css('height', $content.prop('scrollHeight') + 'px');
            setTimeout(() => { $content.css('height', ''); }, 100); // Adjust to match CSS transition duration
         });
      } else {
         // Collapse the content
         collapsibleItems.each(async (index, content) => {
            let $content = $(content);
            $content.css('height', $content.height() + 'px');
            $content.addClass('collapsed');
            setTimeout(() => { $content.css('height', '0'); }, 0);
         });
      }

      // If remember state is enabled, store the collapsed state
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");
      if (rememberCollapsedState === true) {
         const sectionName = target.parent().attr('name'); // Access the `name` attribute from the DOM element
         //console.debug(`Remembering expanded state for ${sectionName}.`, target);
         if (sectionName !== undefined) {
            const actor = game.actors.get(this.actor.id);
            await actor.setFlag(game.system.id, `collapsed-${sectionName}`, !isCollapsed);
         }
      }
   }

   /**
    * Restore the expanded state of all collapsible headers.
    * @protected
    */
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
                  const target = document.querySelector(`[name="${sectionName}"]`);
                  if (target) {
                     await this._toggleContent($(target).children('.items-header'), true);
                  } else {
                     // Not found.
                     //console.debug(`_restoreCollapsedState: Element not found ${sectionName}. Flag removed.`);
                     await actor.unsetFlag(game.system.id, key);
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

   async _toggleEquippedState(event) {
      let updateObj = {};
      const item = this._getItemFromActor(event);
      let isEquipped = item.system.equipped;
      // if the item is not equipped or the item is not cursed or the user is GM...
      if (isEquipped === false || item.system.isCursed === false || game.user.isGM) {
         // Toggle the equipped state and store the new state in isEquipped
         isEquipped = !isEquipped;

         // If this is armor and we are equipping it...
         if (item.type === "armor" && isEquipped === true) {
            // Unequip other same type armor.
            const otherSameTypeArmor = this.actor.items.find(aitem => aitem.type === item.type
               && aitem.system.equipped === true
               && aitem.system.isShield === item.system.isShield
               && aitem.system.natural === item.system.natural);
            if (otherSameTypeArmor) {
               await otherSameTypeArmor.update({ "system.equipped": !isEquipped });
            }
         } else if (item.system.isAmmo === false && (item.type === "item" || item.type === 'light')) {
            updateObj["system.containerId"] = null;
         }

         updateObj["system.equipped"] = isEquipped;
         await item.update(updateObj);
      }
   }

   /**
 * Handler for clicking on a container item's collapse/expand icon.
 * @param {MouseEvent} event
 */
   _toggleContainedItems(event) {
      event.preventDefault();

      // The stack of jQuery elements we need to process
      const containers = [$(event.target).closest(".item")];
      const isExpanding = event.target.classList.contains("fa-caret-right");
      const handledIds = [];

      while (containers.length > 0) {
         // Pop the top jQuery element
         const toggledItem = containers.pop();
         const parentId = toggledItem.data("itemId");

         // Get all immediate sibling items that are contained by this parent
         const containedItems = toggledItem
            .siblings(`[data-item-parentid="${parentId}"]`);

         // Toggle the icon on the parent container
         if (isExpanding) {
            toggledItem
               .find(".fas.fa-caret-right")
               .first()
               .removeClass("fa-caret-right")
               .addClass("fa-caret-down");
            containedItems.slideDown(200);
         } else {
            toggledItem
               .find(".fas.fa-caret-down")
               .first()
               .removeClass("fa-caret-down")
               .addClass("fa-caret-right");
            containedItems.slideUp(200);
         }

         // Avoid reprocessing the same container
         handledIds.push(parentId);

         // If we are collapsing, we want to recursively collapse any sub-containers
         if (!isExpanding) {
            // Find each sibling container under these items (the next nesting level)
            const subContainers = containedItems.filter(".item-container");

            // For each container, push the jQuery-wrapped element to the stack
            subContainers.each((i, el) => {
               const $subContainer = $(el);
               const nextParentId = $subContainer.data("itemId");
               if (!handledIds.includes(nextParentId)) {
                  containers.push($subContainer);
               }
            });
         }
      }
   }
}