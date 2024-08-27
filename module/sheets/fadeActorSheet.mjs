import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class fadeActorSheet extends ActorSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
         width: 530,
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

      // Prepare character data and items.
      if (actorData.type == 'character') {
         this._prepareItems(context);
         this._prepareCharacterData(context);
      }

      // Prepare character data and items.
      if (actorData.type == 'monster') {
      }

      // Prepare NPC data and items.
      if (actorData.type == 'npc') {
         this._prepareItems(context);
      }

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

      return context;
   }

   /**
    * Character-specific context modifications
    *
    * @param {object} context The context object to mutate
    */
   _prepareCharacterData(context) {
      // This is where you can enrich character-specific editor fields
      // or setup anything else that's specific to this type
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
      const features = [];
      const spells = {
         1: [],
         2: [],
         3: [],
         4: [],
         5: [],
         6: [],
         7: [],
         8: [],
         9: [],
      };
      const specialAbilities = [];

      // Iterate through items, allocating to containers
      for (let i of context.items) {
         i.img = i.img || Item.DEFAULT_ICON;
         // Append to gear.
         if (i.type === 'item') {
            gear.push(i);
         }
         // Append to features.
         else if (i.type === 'feature') {
            features.push(i);
         }
         // Append to spells.
         else if (i.type === 'spell') {
            if (i.system.spellLevel != undefined) {
               spells[i.system.spellLevel].push(i);
            }
         }
         // Append to weapons.
         else if (i.type === 'weapon') {
            weapons.push(i);
         }
         // Append to armor.
         else if (i.type === 'armor') {
            armor.push(i);
         }
         // Append to skills.
         else if (i.type === 'skill') {
            skills.push(i);
         }
         // Append to masteries.
         else if (i.type === 'mastery') {
            masteries.push(i);
         }// Append to specialAbility.
         else if (i.type === 'specialAbility') {
            specialAbilities.push(i);
         }
      }

      // Assign and return
      context.gear = gear;
      context.weapons = weapons;
      context.armor = armor;
      context.skills = skills;
      context.masteries = masteries;
      context.features = features;
      context.spells = spells;
      context.specialAbilities = specialAbilities;
   }

   /* -------------------------------------------- */

   _toggleCollapsibleContent(event) {
      const header = event.currentTarget; // Get the clicked element
      $(header).siblings('.collapsible-content').each(function () {
         const $content = $(this);
         if ($content.hasClass('collapsed')) {
            // Expanding
            $content.removeClass('collapsed');
            $content.css('height', $content.prop('scrollHeight') + 'px');
            setTimeout(function () {
               $content.css('height', '');
            }, 500); // Match this duration to your CSS transition duration
         } else {
            // Collapsing
            $content.css('height', $content.height() + 'px');
            $content.addClass('collapsed');
            setTimeout(function () {
               $content.css('height', '0');
            }, 0);
         }
      });
   }


   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Render the item sheet for viewing/editing prior to the editable check.
      html.on('click', '.item-edit', (ev) => {
         const li = $(ev.currentTarget).parents('.item');
         const item = this.actor.items.get(li.data('itemId'));
         item.sheet.render(true);
      });

      // -------------------------------------------------------------
      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Add Inventory Item
      html.on('click', '.item-create', this._onItemCreate.bind(this));

      // Delete Inventory Item
      html.on('click', '.item-delete', (ev) => {
         const li = $(ev.currentTarget).parents('.item');
         const item = this.actor.items.get(li.data('itemId'));
         item.delete();
         li.slideUp(200, () => this.render(false));
      });

      // Active Effect management
      html.on('click', '.effect-control', (ev) => {
         const row = ev.currentTarget.closest('li');
         const document = row.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(row.dataset.parentId);
         onManageActiveEffect(ev, document);
      });

      // Rollable abilities.
      html.on('click', '.rollable', this._onRoll.bind(this));

      // Drag events for macros.
      if (this.actor.isOwner) {
         let handler = (ev) => this._onDragStart(ev);
         html.find('li.item').each((i, li) => {
            if (li.classList.contains('inventory-header')) return;
            li.setAttribute('draggable', true);
            li.addEventListener('dragstart', handler, false);
         });
      }

      // Bind the collapsible functionality to the header click event
      html.find('.collapsible-header').on('click', (event) => {
         this._toggleCollapsibleContent(event);
      });

      // Toggle Equipment
      html.find(".item-toggle").click(async (ev) => {
         const li = $(ev.currentTarget).closest(".item"); // Using closest instead of parents for accuracy
         const item = this.actor.items.get(li.data("itemId"));
         // Toggle the equipped state and store the new state in isEquipped
         const isEquipped = !item.system.equipped;
         await item.update({ "system.equipped": isEquipped });
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
      return await Item.create(itemData, { parent: this.actor });
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

      console.log("fadeActor._onRoll", dataset);

      if (dataset.rollType === 'item') {
         const li = $(event.currentTarget).parents('.item');
         const item = this.actor.items.get(li.data('itemId'));
         if (item) item.roll();
      }
      else if (dataset.test === 'ability') {
         dataset.dialog = dataset.test;
         cardType = CHAT_TYPE.ABILITY_CHECK;
         dialogResp = await DialogFactory(dataset, this.actor);
         formula = dialogResp.resp.mod != 0 ? "1d20-@mod" : "1d20";
      } else if (dataset.test === "generic") {
         dataset.dialog = dataset.test;
         cardType = CHAT_TYPE.GENERIC_ROLL;
         dialogResp = await DialogFactory(dataset, this.actor);
         formula = dialogResp.resp.mod != 0 ?
            (dataset.pass.startsWith("gt") ? `${formula}+@mod` : `${formula}-@mod`)
            : formula;
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
}
