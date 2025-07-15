const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
import { DragDropMixin } from "./mixins/DragDropMixin.mjs";
import { EffectManager } from "../sys/EffectManager.mjs";
import { ChatFactory, CHAT_TYPE } from "../chat/ChatFactory.mjs";
import { FDItem } from "../item/FDItem.mjs";
import { fadeFinder } from "/systems/fantastic-depths/module/utils/finder.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FDActorSheetV2 extends DragDropMixin(HandlebarsApplicationMixin(ActorSheetV2)) {

   constructor(options = {}) {
      super(options);
   }

   static DEFAULT_OPTIONS = {
      position: {
         top: 150,
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
         deleteTag: FDActorSheetV2.#clickDeleteTag,
         createEffect: FDActorSheetV2.#clickEffect,
         editEffect: FDActorSheetV2.#clickEffect,
         deleteEffect: FDActorSheetV2.#clickEffect,
         toggleEffect: FDActorSheetV2.#clickEffect,
         editImage: FDActorSheetV2.#onEditImage,
         resetSpells: FDActorSheetV2.#clickResetSpells,
         rollItem: FDActorSheetV2.#clickRollItem,
         rollGeneric: FDActorSheetV2.#clickRollGeneric,
         rollAbility: FDActorSheetV2.#clickRollAbility,
         rollMorale: FDActorSheetV2.#clickRollMorale,
         rollSave: FDActorSheetV2.#clickRollSave,
         createItem: FDActorSheetV2.#clickCreateItem,
         deleteItem: FDActorSheetV2.#clickDeleteItem,
         editItem: FDActorSheetV2.#clickEditItem,
         editClass: FDActorSheetV2.#clickEditClass,
         editSpecies: FDActorSheetV2.#clickEditSpecies,
         toggleEquipped: FDActorSheetV2.#clickToggleEquipped,
         toggleHeader: FDActorSheetV2.#clickToggleHeader,
         toggleContainer: FDActorSheetV2.#clickToggleContainer,
         useConsumable: FDActorSheetV2.#clickUseConsumable,
         addConsumable: FDActorSheetV2.#clickAddConsumable,
         useCharge: FDActorSheetV2.#clickUseCharge,
         addCharge: FDActorSheetV2.#clickAddCharge,
         editAbilityScores: FDActorSheetV2.#clickEditAbilityScores,
         expandDesc: FDActorSheetV2.#clickExpandDesc,
      },
      dragDrop: [{ dragSelector: "[data-document-id]", dropSelector: "form" }],
   }

   /** @inheritDoc */
   async _renderFrame(options) {
      this._frame = await super._renderFrame(options);
      return this._frame;
   }

   /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param {ApplicationRenderContext} context      Prepared context data
     * @param {RenderOptions} options                 Provided render options
     * @protected
     */
   _onRender(context, options) {
      // Call the original render method with modified options
      super._onRender(context, options);

      if (this.isEditable === false) return;

      // Use setTimeout to allow the DOM to be fully updated before restoring collapsed state
      setTimeout(async () => { await this._restoreCollapsedState(); }, 0);

      const inputField = this.element.querySelector('input[data-action="addTag"]');
      inputField?.addEventListener('keydown', (event) => {
         if (event.key === 'Enter') { // Check if the Enter key is pressed
            const value = event.target.value; // Get the value of the input
            this.actor.tagManager.pushTag(value); // Push the value to the tag manager
         }
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

   /** @override */
   async _prepareContext(options) {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = await super._prepareContext();

      // Use a safe clone of the actor data for further operations.
      const actor = this.actor.toObject(false);
      context.actor = actor;
      context.actor.uuid = this.actor.uuid;

      // Add the actor"s data to context.data for easier access, as well as flags.
      context.system = actor.system;
      context.flags = actor.flags;
      context.isSpellcaster = actor.system.config.maxSpellLevel > 0;
      context.isGM = game.user.isGM;
      context.isOwner = this.actor.testUserPermission(game.user, "OWNER");

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      context.isBasicEnc = encSetting === "basic";
      context.showWeight = encSetting === "expert" || encSetting === "classic";
      context.isAAC = game.settings.get(game.system.id, "toHitSystem") === "aac";
      context.masterySetting = game.settings.get(game.system.id, "weaponMastery");
      context.weaponMasteryEnabled = game.settings.get(game.system.id, "weaponMastery") != "none";
      context.abilityAbbr = game.settings.get(game.system.id, "abilityAbbr");
      context.saveAbbr = game.settings.get(game.system.id, "saveAbbr");
      context.useAV = game.settings.get(game.system.id, "useArmorValue") && this.actor.system.ac.av?.length > 0;
      context.sizes = CONFIG.FADE.ActorSizes
         .map((size) => { return { text: game.i18n.localize(`FADE.Actor.sizes.${size.id}`), value: size.id } })
         .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare shared actor data and items.
      await this.#prepareItems(context);

      // Enrich biography info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;
      context.enrichedBiography = await textEditorImp.enrichHTML(this.actor.system.biography, {
         secrets: this.document.isOwner,
         rollData: this.actor.getRollData(),
         relativeTo: this.actor,
      });

      // Prepare active effects
      // A generator that returns all effects stored on the actor as well as any items
      context.effects = EffectManager.prepareActiveEffectCategories(
         this.actor.allApplicableEffects()
      );
      // Equipped Weapons
      const attackGroups = [];
      for (let item of this.actor.items) {
         item.img = item.img || Item.DEFAULT_ICON;
         if (item.type === "weapon" && item.system.equipped === true) {
            const group = item.system.attacks.group;
            if (!attackGroups[group]) {
               attackGroups[group] = [];
            }
            attackGroups[group].push(item);
         }
      }
      context.attackGroups = attackGroups;

      return context;
   }

   getTreasureValue(context) {
      const total = context.treasure.reduce((acc, current) => acc + current.system.totalCost, 0);
      return Math.round(total * 100) / 100;
   }

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
      const targetId = event.target.closest(".item")?.dataset?.itemId;
      const targetItem = this.actor.items.get(targetId);
      const targetIsContainer = targetItem?.system.container;
      const classSystem = game.fade.registry.getSystem("classSystem");
      if (this.actor.uuid === droppedItem?.parent?.uuid && targetIsContainer !== true) {
         this._onSortItem(event, droppedItem);
      } else {
         // If the dropped item is a weapon mastery definition item...
         if (droppedItem.type === "weaponMastery" && this.#hasSameActorMastery(droppedItem) === false) {
            droppedItem.createActorWeaponMastery(this.actor);
         }
         // If the dropped item is a class definition item...
         else if (droppedItem.type === "class" && this.#hasSameActorClass(droppedItem) === false) {
            if (this.actor.type === "character") {
               classSystem.createActorClass(this.actor, droppedItem);
            }
         }
         // If the drop target is a container...
         else if (droppedItem.type === "item" || droppedItem.type === "light" || droppedItem.type === "treasure") {
            if (targetIsContainer && droppedItem.system.containerId !== targetId && targetId !== droppedItem.id) {
               const itemData = droppedItem.toObject();
               if (droppedItem.actor == null) {
                  const newItem = await this._onDropItemCreate(itemData);
                  await newItem[0].update({ "system.containerId": targetId });
               } else if (droppedItem.actor.id != this.actor.id) {
                  const newItem = await this._onDropItemCreate(itemData);
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
               super._onDropItem(event, item);
            }
         } else if (droppedItem.type === "species") {
            if (this.actor.type === "character") {
               await this.actor.update({ "system.details.species": droppedItem.name });
            }
         } else if (droppedItem.type === "effect") {
         }
         else {
            super._onDropItem(event, item);
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
     * @param event
     * @param {bool} decrement
     */
   async _useConsumable(event, decrement) {
      const item = this._getItemFromActor(event);
      let quantity = item.system.quantity;
      await item.update({ "system.quantity": decrement ? --quantity : ++quantity, });
   }

   /**
     * @param event
     * @param {bool} decrement
     */
   async _useCharge(event, decrement) {
      const item = this._getItemFromActor(event);
      let charges = item.system.charges;
      // Only allow GM to increase charges
      if (game.user.isGM === true) {
         await item.update({ "system.charges": decrement ? --charges : ++charges, });
      } else if (decrement === false) {
         await item.update({ "system.charges": --charges });
      }
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
    * Restore the expanded state of all collapsible headers.
    * @protected
    */
   async _restoreCollapsedState() {
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");
      // Retrieve all flags that start with "collapsed-"
      const flags = this.actor.flags[game.system.id] || {};

      if (rememberCollapsedState === true) {
         Object.keys(flags).forEach(async (key) => {
            // Only process flags that start with "collapsed-"
            if (key.startsWith("collapsed-") && key !== "collapsed-undefined") {
               const sectionName = key.replace("collapsed-", ""); // Extract section name
               const isCollapsed = flags[key];
               if (isCollapsed === true) {
                  // Find the collapsible section by the "name" attribute
                  const target = this.element.querySelector(`[name="${sectionName}"]`);
                  if (target) {
                     await this.#toggleContent(target, true);
                  } else {
                     // Not found.
                     //console.debug(`_restoreCollapsedState: Element not found ${sectionName}. Flag removed.`);
                     await this.actor.unsetFlag(game.system.id, key);
                  }
               }
            } else if (key === "collapsed-undefined") {
               // Clean up any invalid flags (optional)
               await this.actor.unsetFlag(game.system.id, key);
               console.warn("Removed invalid flag: collapsed-undefined");
            }
         });
      } else {
         Object.keys(flags).forEach(async (key) => {
            if (key.startsWith("collapsed-") && key !== "collapsed-undefined") {
               await this.actor.unsetFlag(game.system.id, key);
            }
         });
      }
   }

   /**
    * Handler for clicking on a container item"s collapse/expand icon.
    * @param {MouseEvent} event
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

   #hasSameActorMastery(item) {
      return this.actor.items.find(i => i.type === "mastery" && i.name === item.name) !== undefined;
   }
   #hasSameActorClass(item) {
      return this.actor.items.find(i => i.type === "actorClass" && i.name === item.name) !== undefined;
   }

   /**
    * Toggles the collapsible content based on the isCollapsed state.
    * This method is separate from the event handler because it is also called to restore expanded state when opening the sheet.
    * @param {any} parent The clicked element as a jquery object.
    */
   async #toggleContent(parent) {
      const collapsibleItems = parent.querySelectorAll(".collapsible-content");
      const isCollapsed = collapsibleItems[0].classList.contains("collapsed");

      if (isCollapsed === true) {
         // Expand the content
         collapsibleItems.forEach((content) => {
            const contentElement = content; // The current content element
            contentElement.classList.remove("collapsed");

            contentElement.style.height = contentElement.scrollHeight + "px";

            // Reset the height after the transition duration
            setTimeout(() => { contentElement.style.height = ""; }, 100); // Adjust to match CSS transition duration
         });
      } else {
         // Collapse the content
         collapsibleItems.forEach((content) => {
            const contentElement = content; // The current content element

            contentElement.style.height = contentElement.clientHeight + "px";
            contentElement.classList.add("collapsed");

            // Collapse the content by setting height to 0
            setTimeout(() => { contentElement.style.height = "0"; }, 0);
         });
      }

      // If remember state is enabled, store the collapsed state
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");
      if (rememberCollapsedState === true) {
         const sectionName = parent.getAttribute("name"); // Access the `name` attribute from the DOM element
         //console.debug(`Remembering expanded state for ${sectionName}.`, target);
         if (sectionName !== undefined) {
            await this.actor.setFlag(game.system.id, `collapsed-${sectionName}`, !isCollapsed);
         }
      }
   }

   /**
    * Organize and classify Items for Actor sheets.
    *
    * @param {object} context The context object to mutate
    */
   async #prepareItems(context) {
      // Initialize arrays.
      let gear = [];
      const weapons = [];
      const armor = [];
      const skills = [];
      const masteries = [];
      const treasure = [];
      const specialAbilities = [];
      const exploration = [];
      const classAbilities = [];
      const savingThrows = [];
      const conditions = [];
      const actorClasses = [];

      const items = [...this.actor.items];
      // Iterate through items, allocating to arrays
      for (let item of items) {
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
         // Append to armor.
         else if (item.type === "armor") {
            armor.push(item);
         }
         // Append to skills.
         else if (item.type === "skill") {
            skills.push(item);
         }
         // Append to conditions.
         else if (item.type === "condition") {
            conditions.push(item);
         }
         // Append to masteries.
         else if (item.type === "mastery") {
            masteries.push(item);
         }
         // Append to classes.
         else if (item.type === "actorClass") {
            actorClasses.push(item);
         }
         // Append to specialAbility.
         else if (item.type === "specialAbility") {
            const operators = {
               eq: "=",
               gt: "&gt;",
               lt: "&lt;",
               gte: "&gt;=",
               lte: "&lt;="
            };
            if (item.system.category === "explore") {
               exploration.push({ item, op: operators[item.system.operator] });
            } else if (item.system.category === "class") {
               classAbilities.push(item);
            } else if (item.system.category === "save") {
               savingThrows.push(item);
            } else {
               specialAbilities.push(item);
            }
         }
      }

      // Add derived data to each item
      gear = gear.map((item) => this.#mapContainer(item));

      // Assign and return
      context.gear = gear;
      context.weapons = weapons;
      context.armor = armor;
      context.skills = skills;
      context.masteries = masteries;
      context.treasure = treasure;
      context.treasureValue = this.getTreasureValue(context);
      const classSystem = game.fade.registry.getSystem("classSystem");
      context.spellClasses = await classSystem.prepareSpellsContext(this.actor);
      context.specialAbilities = specialAbilities;
      context.classAbilities = classAbilities;
      context.exploration = exploration;
      context.savingThrows = savingThrows;
      context.conditions = conditions;
      context.actorClasses = actorClasses;

      Object.assign(context, game.fade.registry.getSystem("encumbranceSystem").calcCategoryEnc(this.actor.items));
   }

   #mapContainer(item) {
      // Attach derived data manually            
      if (item.system.container === true) {
         const docItem = this.actor.items.get(item._id);
         for (let innerItem of docItem?.containedItems) {
            this.#mapContainer(innerItem);
         }
         item.contained = docItem?.containedItems || [];
         // For displaying the containers total weight, including contained items.
         item.containedEnc = docItem?.totalEnc || 0;
      }
      return item;
   }

   static async #clickEffect(event) {
      await EffectManager.onManageActiveEffect(event, this.actor)
   }

   static async #clickResetSpells(event) {
      const classSystem = game.fade.registry.getSystem("classSystem");
      await classSystem.resetSpells(this.actor, event);
   }

   static #clickDeleteTag(event) {
      const tag = event.target.closest(".tag-delete").dataset.tag;
      this.actor.tagManager.popTag(tag);
   }

   /**
   * Edit a Document image.
   * @this {DocumentSheetV2}
   * @type {ApplicationClickAction}
   */
   static async #onEditImage(_event, target) {
      if (target.nodeName !== "IMG") {
         throw new Error("The editImage action is available only for IMG elements.");
      }
      const attr = target.dataset.edit;
      const current = foundry.utils.getProperty(this.document._source, attr);
      const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
      const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
      const fp = new FilePicker({
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

   static async #clickToggleEquipped(event) {
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
         } else if (item.system.isAmmo === false && (item.type === "item" || item.type === "light")) {
            updateObj["system.containerId"] = null;
         }

         updateObj["system.equipped"] = isEquipped;
         await item.update(updateObj);
      }
   }

   static async #clickToggleHeader(event) {
      // If not the create item column...
      const parent = event.target.closest(".items-list");
      if (parent) {
         await this.#toggleContent(parent);
      }
   }

   static async #clickToggleContainer(event) {
      await this._toggleContainedItems(event)
   }

   /**
    * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
    * @param {Event} event The originating click event
    * @private
    */
   static async #clickCreateItem(event) {
      event.preventDefault();
      const target = event.target.closest(".item-control");
      // Get the type of item to create.
      const type = target.dataset.type;
      // Grab any data associated with this control.
      const data = foundry.utils.duplicate(target.dataset);

      // If tags are specified
      if (target.dataset.tags?.length > 0) {
         data.tags = target.dataset.tags.split(",");
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
      delete itemData.system["type"];

      // Finally, create the item!
      return await FDItem.create(itemData, { parent: this.actor });
   }

   static async #clickDeleteItem(event) {
      const item = this._getItemFromActor(event);
      if (item.type === "condition" && game.user.isGM === false) return;
      const parent = $(event.target).parents(".item");
      item.delete();
      parent.slideUp(200, () => this.render(false));
   }

   static async #clickEditItem(event) {
      this._getItemFromActor(event)?.sheet?.render(true);
   }

   static async #clickEditClass(event) {
      const dataset = event.target.dataset;
      const classItem = await fadeFinder.getClass(dataset.classname);
      classItem?.sheet?.render(true)
   }

   static async #clickEditSpecies(event) {
      const speciesItem = await fadeFinder.getSpecies(this.actor.system.details.species);
      speciesItem?.sheet?.render(true)
   }

   static async #clickRollGeneric(event) {
      const dataset = event.target.dataset;
      let formula = dataset.formula;
      const chatType = CHAT_TYPE.GENERIC_ROLL;
      const rollContext = { ...this.actor.getRollData() };
      const rolled = await new Roll(formula, rollContext).evaluate();
      const chatData = {
         caller: this.actor,
         context: this.actor,
         mdata: dataset,
         roll: rolled
      };
      const showResult = this.actor._getShowResult(event);
      const builder = new ChatFactory(chatType, chatData, { showResult });
      return builder.createChatMessage();
   }

   static async #clickRollItem(event) {
      const dataset = event.target.dataset;
      const item = this._getItemFromActor(event);
      // Directly roll item and skip the rest
      if (item) await item.roll(dataset, null, event);
   }

   static async #clickRollSave(event) {
      const item = this._getItemFromActor(event);
      this.actor.rollSavingThrow(item.system.customSaveCode, event);
   }

   static async #clickRollAbility(event) {
      const abilityCheckSys = await game.fade.registry.getSystem("abilityCheck");
      abilityCheckSys.execute({ actor: this.actor, event });
   }

   static async #clickRollMorale(event) {
      const moraleCheckSys = await game.fade.registry.getSystem("moraleCheck");
      moraleCheckSys.execute({ actor: this.actor, event });
   }

   static async #clickUseConsumable(event) {
      await this._useConsumable(event, true);
   }

   static async #clickAddConsumable(event) {
      await this._useConsumable(event, false);
   }

   static async #clickUseCharge(event) {
      await this._useCharge(event, true);
   }

   static async #clickAddCharge(event) {
      await this._useCharge(event, false);
   }

   static async #clickEditAbilityScores(event) {
      this.editScores = !this.editScores;
      $(event.currentTarget).find(".ability-score-input, .ability-score, .ability-mod").toggle();
   }

   static async #clickExpandDesc(event) {
      // If not the create item column...
      const descElem = $(event.target).parents(".item").find(".item-description");
      if (descElem) {
         const isCollapsed = $(descElem[0]).hasClass("desc-collapsed");
         if (isCollapsed === true) {
            descElem.removeClass("desc-collapsed");
            const itemElement = $(event.target).parents(".item");
            const item = this.actor.items.get(itemElement.data("itemId"));
            if (item !== null) {
               const enrichedDesc = await item.getInlineDescription();
               if (enrichedDesc.startsWith("<") === false) {
                  descElem.append(enrichedDesc);
               } else {
                  descElem.append($(enrichedDesc));
               }
            }
         } else {
            descElem.addClass("desc-collapsed");
            descElem.empty();
         }
      }
   }
}