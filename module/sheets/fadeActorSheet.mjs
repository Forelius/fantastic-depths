import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { fadeItem } from '../item/fadeItem.mjs';
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class fadeActorSheet extends ActorSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
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
      if (this.actor.type === 'character') {
         options.width = 600;
         options.height = 540;
      } else if (this.actor.type === "monster") {
         options.width = 650;
         options.height = 540;
      } else {
         options.width = 600;
         options.height = 540;
      }

      // Call the original render method with modified options
      await super.render(force, options);

      // Use setTimeout to allow the DOM to be fully updated before restoring collapsed state
      setTimeout(() => { this._restoreCollapsedState(); }, 0);
   }

   /** @override */
   get template() {
      return `systems/fantastic-depths/templates/actor/${this.actor.type}-sheet.hbs`;
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

      // Adding a pointer to CONFIG.FADE
      context.config = CONFIG.FADE;

      //console.log("fadeActorSheet.getData()", context);

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
      context.effects = prepareActiveEffectCategories(
         // A generator that returns all effects stored on the actor
         // as well as any items
         this.actor.allApplicableEffects()
      );

      context.isGM = game.user.isGM;
      context.isOwner = this.actor.testUserPermission(game.user, "OWNER");

      return context;
   }

   /**
    * Organize and classify Items for Actor sheets.
    *
    * @param {object} context The context object to mutate
    */
   _prepareItems(context) {
      // Initialize containers.
      const gear = [];
      const weapons = [];
      const armor = [];
      const skills = [];
      const masteries = [];
      const spellSlots = {
         1: { spells: [] },
         2: { spells: [] },
         3: { spells: [] },
         4: { spells: [] },
         5: { spells: [] },
         6: { spells: [] },
         7: { spells: [] },
         8: { spells: [] },
         9: { spells: [] },
      };
      const treasure = [];
      const specialAbilities = [];

      // Iterate through items, allocating to containers
      for (let item of context.items) {
         item.img = item.img || Item.DEFAULT_ICON;
         // Append to gear or treasure.
         if (item.type === 'item') {
            // If treasure...
            if (item.system.tags.includes("treasure")) {
               treasure.push(item);
            } else {
               gear.push(item);
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
            specialAbilities.push(item);
         }
      }

      // Assign and return
      context.gear = gear;
      context.weapons = weapons;
      context.armor = armor;
      context.skills = skills;
      context.masteries = masteries;
      context.specialAbilities = specialAbilities;
      context.treasure = treasure;
      context.treasureValue = this.getTreasureValue(context);
      context.spellSlots = spellSlots;
   }

   getTreasureValue(context) {
      const total = context.treasure.reduce(
         (acc, current) => acc + current.system.totalCost,
         0
      );
      return Math.round(total * 100) / 100;
   }

   /* -------------------------------------------- */
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
      if (!this.isEditable) return;

      // Add Inventory Item
      html.on('click', '.item-create', this._onItemCreate.bind(this));

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
         onManageActiveEffect(event, document);
      });

      // Rollable abilities.
      html.on('click', '.rollable', this._onRoll.bind(this));

      // Drag events for macros.
      if (this.actor.isOwner) {
         let handler = (event) => this._onDragStart(event);
         html.find('li.item').each((i, li) => {
            if (li.classList.contains('inventory-header')) return;
            li.setAttribute('draggable', true);
            li.addEventListener('dragstart', handler, false);
         });
      }

      // Bind the collapsible functionality to the header click event
      html.find('.collapsible-header').on('click', async (event) => {
         await this._toggleCollapsibleContent(event);
      });

      // Toggle Equipment
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
      html.find(".editable input")
         .click((event) => event.target.select())
         .change(this._onDataChange.bind(this));

      html
         .find(".spells .item-reset[data-action='reset-spells']")
         .click((event) => {
            this._resetSpells(event);
         });
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
      let cardType = null;
      let dialogResp;

      if (dataset.rollType === 'item') {
         const li = $(event.currentTarget).parents('.item');
         const item = this.actor.items.get(li.data('itemId'));
         if (item) item.roll(dataset);
      }
      else if (dataset.test === 'ability') {
         dataset.dialog = dataset.test;
         cardType = CHAT_TYPE.ABILITY_CHECK;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            formula = dialogResp.resp.mod != 0 ? "1d20-@mod" : "1d20";
         }
         // If close button is pressed
         catch (error) {
            cardType = null;
         }
      } else if (dataset.test === "generic") {
         dataset.dialog = dataset.test;
         cardType = CHAT_TYPE.GENERIC_ROLL;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            formula = dialogResp.resp.mod != 0 ? (dataset.pass.startsWith("gt") ? `${formula}+@mod` : `${formula}-@mod`) : formula;
         }
         // If close button is pressed
         catch (error) {
            cardType = null;
         }
      } else if (dataset.rollType === 'damage') {
         cardType = CHAT_TYPE.GENERIC_ROLL;
         console.log("Damage Roll", dataset);
      } else {
         // Basic roll with roll formula and label
         cardType = CHAT_TYPE.GENERIC_ROLL;
      }

      if (cardType !== null) {
         const rollContext = { ...this.actor.getRollData(), ...dialogResp?.resp || {} };
         let rolled = await new Roll(formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            caller: this,
            context: this.actor,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(cardType, chatData);
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
      const spells = $(event.currentTarget).closest(".inventory.spells").find(".item-entry");
      spells.each((_, el) => {
         const { itemId } = el.dataset;
         const item = this.actor.items.get(itemId);
         const itemData = item?.system;
         item.update({
            _id: item.id,
            "system.cast": itemData.memorized,
         });
      });
   }

   /**
    * Toggles the collapsible content based on the isCollapsed state
    * @param {jQuery} $content - The collapsible content to toggle
    * @param {Boolean} isCollapsed - If true, collapse the content; if false, expand the content
    */
   async _toggleContent($parent, skipAnim=false) {
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

   _restoreCollapsedState() {
      const rememberCollapsedState = game.settings.get(game.system.id, "rememberCollapsedState");

      if (rememberCollapsedState === true) {
         const actor = game.actors.get(this.actor.id);

         // Retrieve all flags that start with 'collapsed-'
         const flags = actor.flags[game.system.id] || {};

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
}