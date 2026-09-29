const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
import { DragDropMixin } from "../mixins/DragDropMixin.js";
import { ChatFactory } from "../../chat/ChatFactory.js";
import { CHAT_TYPE } from "../../chat/ChatTypeEnum.js"
import { FDItem } from "../../item/FDItem.js";
import { SpellScrollService } from "../../sys/services/SpellScrollService.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export class FDActorSheetV2 extends DragDropMixin(HandlebarsApplicationMixin(ActorSheetV2)) {

   spellScrollService: SpellScrollService;

   constructor(options = {}) {
      super(options);
      this.isRestoringCollapsedState = false;
      this.spellScrollService = new SpellScrollService();
   }

   static DEFAULT_OPTIONS: Record<string, unknown> = {
      position: {
         width: 650,
         height: 500,
      },
      window: {
         resizable: true,
         minimizable: true,
         //contentClasses: ["scroll-body"]
      },
      form: {
         submitOnChange: true
      },
      classes: ["fantastic-depths", "sheet", "actor"],
      actions: {
         editImage: FDActorSheetV2.#onEditImage,
         createItem: FDActorSheetV2.#clickCreateItem,
         deleteItem: FDActorSheetV2.#clickDeleteItem,
         editItem: FDActorSheetV2.#clickEditItem,
         toggleContainer: FDActorSheetV2.#clickToggleContainer,
         expandDesc: FDActorSheetV2.#clickExpandDesc,
      }
   }

   /** @inheritDoc */
   async _renderFrame(options) {
      this._frame = await super._renderFrame(options);
      return this._frame;
   }

   /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param {any} context Prepared context data
     * @param {any} options Provided render options
     * @protected
     */
   _onRender(context, options) {
      // Call the original render method with modified options
      super._onRender(context, options);

      if (this.isEditable === false) return;

      // Add search functionality
      const searchField = this.element.querySelector('input[name="search"]');
      searchField?.addEventListener('input', (event) => {
         this._filterItems(event.target.value);
      });

      // Temporary fix for now.
      const html = $(this.element);

      // Drag events for macros.
      const dragStartHandler = (event) => this._onDragStart(event);
      html.find("div.item").each((i, li) => {
         // If not an inventory header...
         if (li.classList.contains("items-header") == false) {
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", dragStartHandler, false);
         }
      });

      // Editable
      html.find(".editable input").click((event) => event.target.select()).change(this._onDataChange.bind(this));
   }

   /**
    * Filter items based on search query
    * @param {string} query - The search query
    */
   _filterItems(query) {
      const searchQuery = query.toLowerCase().trim();

      // Show/hide collapsed containers based on search state
      const collapsedContainers = this.element.querySelectorAll('.container-collapsed');
      collapsedContainers.forEach(container => {
         if (searchQuery !== '') {
            // Show collapsed containers during search
            container.style.display = 'block';
         } else {
            // Hide collapsed containers when search is cleared
            container.style.display = 'none';
         }
      });

      const itemContainers = [
         { name: 'weaponItems', selector: '[name="weaponItems"]' },
         { name: 'ammoItems', selector: '[name="ammoItems"]' },
         { name: 'armorItems', selector: '[name="armorItems"]' },
         { name: 'gearItems', selector: '[name="gearItems"]' },
         { name: 'treasureItems', selector: '[name="treasureItems"]' }
      ];

      itemContainers.forEach(containerInfo => {
         const itemsTab = this.element.querySelector('[name="itemsTab"]');
         if (!itemsTab) return;
         const container = itemsTab.querySelector(containerInfo.selector);
         if (!container) return;

         const itemNames = container.querySelectorAll('[name="itemName"]');
         let visibleItems = 0;

         itemNames.forEach(itemNameElement => {
            const itemName = itemNameElement.textContent?.toLowerCase() || '';
            const isVisible = searchQuery === '' || itemName.includes(searchQuery);
            const item = itemNameElement.closest('.item.collapsible-content');
            item.style.display = isVisible ? '' : 'none';

            // Also hide related item-charges and item-uses elements with same data-item-id
            const itemId = item.getAttribute('data-item-id');
            if (itemId) {
               const chargesElement = itemsTab.querySelector(`[name="item-charges"][data-item-id="${itemId}"]`);
               const usesElement = itemsTab.querySelector(`[name="item-uses"][data-item-id="${itemId}"]`);

               if (chargesElement) chargesElement.style.display = isVisible ? '' : 'none';
               if (usesElement) usesElement.style.display = isVisible ? '' : 'none';
            }

            if (isVisible) visibleItems++;
         });

         // Hide the entire container if no items are visible and there's a search query
         if (searchQuery !== '' && visibleItems === 0) {
            container.style.display = 'none';
         } else {
            container.style.display = '';
         }
      });
   }

   async _prepareContext() {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = await super._prepareContext();

      // Use a safe clone of the actor data for further operations.
      const actor = this.actor.toObject(false);
      context.actor = actor;
      context.actor.uuid = this.actor.uuid;
      context.showEquipped = false;

      // Enrich biography info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      const textEditorImp = foundry.applications.ux.TextEditor.implementation;
      context.enrichedBiography = await textEditorImp.enrichHTML(this.actor.system.biography, {
         secrets: this.document.isOwner,
         rollData: this.actor.getRollData(),
         relativeTo: this.actor,
      });

      // Add the actor"s data to context.data for easier access, as well as flags.
      context.system = actor.system;
      context.flags = actor.flags;
      context.isSpellcaster = false;
      context.isGM = game.user.isGM;
      context.isOwner = this.actor.testUserPermission(game.user, "OWNER");

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      context.isBasicEnc = encSetting === "basic";
      context.showWeight = encSetting === "expert" || encSetting === "classic";
      context.isAAC = game.settings.get(game.system.id, "toHitSystem") === "aac";
      context.useAV = game.settings.get(game.system.id, "useArmorValue") && this.actor.system.ac?.av?.length > 0;
      context.sizes = CONFIG.FADE.ActorSizes.map((size) => { return { text: game.i18n.localize(`FADE.Actor.sizes.${size.id}`), value: size.id } })
         .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare shared actor data and items.
      await this._prepareItems(context);

      return context;
   }

   getTreasureValue(context) {
      const total = context.treasure.reduce((acc, current) => acc + current.system.totalCost, 0);
      return Math.round(total * 100) / 100;
   }

   /**
    * Handle a dropped Item on the Actor Sheet.
    * @param {any} event     The initiating drop event
    * @param {Item} item           The dropped Item document
    * @returns {Promise<Item[] | boolean>}
    * @protected
    */
   async _onDropItem(event, item): Promise<Item[] | boolean> {
      let result: Item[] | boolean = false;

      if (this.actor.isOwner) {
         const droppedItem = await Item.implementation.fromDropData(item) as FDItem;
         const targetId = event.target.closest(".item")?.dataset?.itemId;
         const targetItem = this.actor.items.get(targetId);
         const targetIsContainer = targetItem?.system.container;

         if (this.actor.uuid === droppedItem?.parent?.uuid && targetIsContainer !== true) {
            result = this._onSortItem(event, droppedItem);

            // Dragging a contained item out onto the top-level list (outside any container's contained-items area) must detach it from its container.
            const sourceItem = this.actor.items.get(droppedItem.id);
            if (sourceItem?.system.containerId && event.target.closest(".contained-items") === null) {
               await sourceItem.update({ "system.containerId": "" });
            }
         } else {
            // If the drop target is a container...
            if (droppedItem.type === "item" || droppedItem.type === "light" || droppedItem.type === "treasure") {
               if (targetIsContainer && droppedItem.system.containerId !== targetId && targetId !== droppedItem.id) {
                  const itemData = droppedItem.toObject();
                  if (droppedItem.actor == null) {
                     const newItem = await this._onDropItemCreate(itemData);
                     await newItem[0].update({ "system.containerId": targetId });
                     result = newItem;
                  } else if (droppedItem.actor.id != this.actor.id) {
                     const newItem = await this._moveOrSplitItem(event, droppedItem, itemData);
                     await newItem.update({ "system.containerId": targetId });
                     result = [newItem];
                  } else {
                     await droppedItem.update({ "system.containerId": targetId });
                  }
               }
               // The drop target is not a container
               else {
                  result = await super._onDropItem(event, item);
               }
            } else if (droppedItem.type === "skill") {
            } else if (droppedItem.type === "condition") {
            } else if (droppedItem.type === "specialAbility") {
            } else if (droppedItem.type === "actorClass") {
            } else if (droppedItem.type === "weaponMastery") {
            } else if (droppedItem.type === "class") {
            } else if (droppedItem.type === "species") {
            } else if (droppedItem.type === "effect") {
            } else if (droppedItem.type === "spell") {
            } else {
               result = await super._onDropItem(event, item);
            }
         }
      }

      return result;
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
    * Retrieves an item owned by the actor based on parent element"s data-item-id.
    * @param {any} event
    * @returns 
    */
   _getItemFromActor(event) {
      const parent = $(event.target).parents(".item");
      return this.actor.items.get(parent.data("itemId"));
   }

   /**
    * Event handler for editable item fields.
    * @param {any} event
    * @returns
    */
   async _onDataChange(event) {
      let result = null;
      //event.preventDefault();
      const item = this._getItemFromActor(event);
      const newVal = event.target.value === "" ? null : Number(event.target.value);
      const updateData = {};
      const allowNull = ["system.memorized", "system.waMax"];
      // If the field allows nulls...
      if (allowNull.includes(event.target.dataset.field)) {
         updateData[`${event.target.dataset.field}`] = newVal;
      } else {
         // Otherwise nulls become a zero.
         updateData[`${event.target.dataset.field}`] = newVal ?? 0;
      }
      result = await item.update(updateData);
      return result;
   }

   /**
    * Handler for clicking on a container item"s collapse/expand icon.
    * @param {any} event
    */
   async _toggleContainedItems(event) {
      event.preventDefault();

      // The stack of jQuery elements we need to process
      const containers = [$(event.target).closest(".item")];
      const isExpanding = event.target.classList.contains("fa-caret-right");
      const handledIds = [];
      const updates = [];

      while (containers.length > 0) {
         // Pop the top jQuery element
         const toggledItem = containers.pop();

         const parentId = toggledItem.data("itemId");
         const containedItems = toggledItem.siblings(`[data-item-parentid="${parentId}"]`);
         // Avoid reprocessing the same container
         handledIds.push(parentId);
         updates.push({ _id: parentId, "system.isOpen": isExpanding });

         // If we are collapsing, we want to recursively collapse any sub-containers
         if (isExpanding === false) {
            // Find each sibling container under these items (the next nesting level)
            const subContainers = containedItems.filter(".item-container");
            // For each container, push the jQuery-wrapped element to the stack
            subContainers.each((i, el) => {
               const $subContainer = $(el);
               const nextParentId = $subContainer.data("itemId");
               if (handledIds.includes(nextParentId) === false) {
                  updates.push({ _id: nextParentId, "system.isOpen": isExpanding });
                  // Push this sub-container onto the stack of containers to collapse.
                  containers.push($subContainer);
               }
            });
         }
      }

      this.actor.updateEmbeddedDocuments("Item", updates);
   }

   /**
    * Toggles the collapsible content based on the isCollapsed state.
    * This method is separate from the event handler because it is also called to restore expanded state when opening the sheet.
    * @param {any} parent The clicked element as a jquery object.
    */
   static async #toggleContent(sheet, parent) {
      const actor = sheet.actor;
      const collapsibleItems = parent.querySelectorAll(".collapsible-content");
      if (!collapsibleItems || collapsibleItems.length == 0) return;
      const isCollapsed = collapsibleItems[0].classList.contains("collapsed");

      if (isCollapsed === true) {
         // Expand the content
         collapsibleItems.forEach((content) => {
            const contentElement = content; // The current content element
            contentElement.classList.remove("collapsed");
            contentElement.style.height = contentElement.scrollHeight + "px";
         });
      } else {
         // Collapse the content
         collapsibleItems.forEach((content) => {
            const contentElement = content; // The current content element
            contentElement.classList.add("collapsed");
            contentElement.style.height = "0";// contentElement.clientHeight + "px";
         });
      }
      // If remember state is enabled, store the collapsed state
      if (sheet.isRestoringCollapsedState === false) {
         const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");
         if (rememberCollapsedState === true) {
            const sectionName = parent.getAttribute("name"); // Access the `name` attribute from the DOM element
            if (sectionName !== undefined) {
               await actor.setFlag(game.system.id, `collapsed-${sectionName}`, !isCollapsed);
            }
         }
      }
   }

   /**
    * Organize and classify Items for Actor sheets.
    * @param {object} context The context object to mutate
    */
   async _prepareItems(context) {
      // Initialize arrays.
      let gear = [];
      const weapons = [];
      const ammo = [];
      const armor = [];
      const treasure = [];

      const items = [...this.actor.items];
      // Iterate through items, allocating to arrays
      for (const item of items) {
         item.img = item.img || Item.DEFAULT_ICON;
         // Append to gear or treasure.
         if (item.type === "item" || item.type === "light" || item.type === "treasure") {
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
            // If this is a treasure item...
            if (item.type === "treasure") {
               // Also add to the treasure array
               treasure.push(item);
            }
         }
         // Append to weapons.
         else if (item.type === "weapon") {
            weapons.push(item);
         }
         // Append to ammo.
         else if (item.type === "ammo") {
            ammo.push(item);
         }
         // Append to armor.
         else if (item.type === "armor") {
            armor.push(item);
         }
      }

      // Add derived data to each item
      gear = gear.map((item) => this._mapContainer(item));

      // Assign and return
      context.gear = gear;
      context.weapons = weapons;
      context.ammo = ammo;
      context.armor = armor;
      context.treasure = treasure.sort((a, b) => a.system.cost - b.system.cost);
      context.treasureValue = this.getTreasureValue(context);

      Object.assign(context, game.fade.registry.getSystem("encumbranceSystem").calcCategoryEnc(this.actor.items));
   }

   _mapContainer(item) {
      // Attach derived data manually            
      if (item.system.container === true) {
         const docItem = this.actor.items.get(item._id);
         for (const innerItem of docItem?.containedItems) {
            this._mapContainer(innerItem);
         }
         item.contained = docItem?.containedItems || [];
         // For displaying the containers total weight, including contained items.
         item.containedEnc = docItem?.totalEnc || 0;
      }
      return item;
   }

   /**
   * Edit a Document image.
   * @this {FDActorSheetV2}
   * @param {any} _event
   * @param {any} target
   */
   static async #onEditImage(this: FDActorSheetV2, _event, target) {
      if (target.nodeName !== "IMG") {
         throw new Error("The editImage action is available only for IMG elements.");
      }
      const attr = target.dataset.edit;
      const current = foundry.utils.getProperty(this.document._source, attr);
      const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
      const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
      const fp = new foundry.applications.apps.FilePicker.implementation({
         current,
         type: "image",
         redirectToRoot: defaultImage ? [defaultImage] : [],
         callback: path => {
            target.src = path;
            this.submit();
         },
         top: this.position.top + 40,
         left: this.position.left + 10
      });
      await fp.browse();
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickToggleHeader(event) {
      // If not the create item column...
      const parent = event.target.closest(".items-list");
      if (parent) {
         await FDActorSheetV2.#toggleContent(this, parent);
      }
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickToggleContainer(this: FDActorSheetV2, event) {
      await this._toggleContainedItems(event)
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
    * @param {any} event The originating click event
    */
   static async #clickCreateItem(this: FDActorSheetV2, event) {
      event.preventDefault();
      const target = event.target.closest(".item-control");
      // Get the type of item to create.
      const type = target.dataset.type;
      // Grab any data associated with this control.
      const data = foundry.utils.duplicate(target.dataset);

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
      delete itemData.system["type"];

      // Finally, create the item!
      return await FDItem.create(itemData, { parent: this.actor });
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickDeleteItem(this: FDActorSheetV2, event) {
      const item = this._getItemFromActor(event);
      const parent = $(event.target).parents(".item");
      item.delete();
      parent.slideUp(200, () => this.render(false));
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickEditItem(this: FDActorSheetV2, event) {
      this._getItemFromActor(event)?.sheet?.render(true);
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickRollGeneric(this: FDActorSheetV2, event): Promise<void> {
      const dataset = event.target.dataset;
      const formula = dataset.formula;
      const chatType = CHAT_TYPE.GENERIC_ROLL;
      const rollContext = { ...this.actor.getRollData() };
      const rolled = await new Roll(formula, rollContext).evaluate();
      const chatData = {
         caller: this.actor,
         context: this.actor,
         mdata: dataset,
         roll: rolled
      };
      const showResult = this.actor.getShowResult(event);
      const builder = new ChatFactory(chatType, chatData, { showResult });
      await builder.createChatMessage();
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickRollItem(this: FDActorSheetV2, event) {
      const dataset = event.target.dataset;
      const item = this._getItemFromActor(event);
      // Directly roll item and skip the rest
      if (item) await item.roll(dataset, null, event);
   }

   /**
    * @this {FDActorSheetV2} `this` is expected to be an instance of MyClass
    * @param {any} event
    */
   static async #clickExpandDesc(this: FDActorSheetV2, event) {
      // If not the create item column...
      //const itemElement = event.target.closest(".item");
      let currentElement = event.target;
      let descElem = null;
      while (currentElement && !descElem) {
         descElem = currentElement.querySelector(".item-description");
         currentElement = currentElement.parentElement;
      }

      if (descElem) {
         const isCollapsed = descElem.classList.contains("desc-collapsed");
         if (isCollapsed === true) {
            descElem.classList.remove("desc-collapsed");
            const itemElement = event.target.closest('[data-item-id]');
            const itemId = itemElement?.dataset.itemId;
            const item = this.actor.items.get(itemId);
            if (item != null) {
               const enrichedDesc = await item.getInlineDescription();
               if (enrichedDesc.startsWith("<") === false) {
                  descElem.appendChild(document.createTextNode(enrichedDesc));
               } else {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = enrichedDesc;
                  while (tempDiv.firstChild) {
                     descElem.appendChild(tempDiv.firstChild);
                  }
               }
            }
         } else {
            descElem.classList.add("desc-collapsed");
            descElem.innerHTML = '';
         }
      }
   }
}