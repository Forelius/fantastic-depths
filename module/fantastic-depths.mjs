import { registerSystemSettings } from "./settings.mjs";
// Import document classes.
import { fadeActor } from './documents/actor.mjs';
import { CharacterActor } from './documents/CharacterActor.mjs';
import { MonsterActor } from './documents/MonsterActor.mjs';
import { fadeItem } from './documents/item.mjs';
import { ArmorItem } from './documents/ArmorItem.mjs';
import { WeaponItem } from './documents/WeaponItem.mjs';
import { ItemFactory } from './helpers/ItemFactory.mjs';
import { ActorFactory } from './helpers/ActorFactory.mjs';
// Import sheet classes.
import { fadeActorSheet } from './sheets/actor-sheet.mjs';
import { fadeItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FADE } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', function () {
   // Add utility classes to the global game object so that they're more easily
   // accessible in global contexts.
   game.fantasticdepths = {
      fadeActor,
      CharacterActor,
      MonsterActor,
      fadeItem,
      ArmorItem,
      WeaponItem,
      rollItemMacro,
   };

   // Add custom constants for configuration.
   CONFIG.FADE = FADE;

   // Register System Settings
   registerSystemSettings();

   /**
    * Set an initiative formula for the system
    * @type {String}
    */
   CONFIG.Combat.initiative = {
      formula: '1d6 + @abilities.dex.mod',
      decimals: 2,
   };

   // Define custom Document classes
   CONFIG.Actor.documentClass = ActorFactory;
   CONFIG.Item.documentClass = ItemFactory;

   // Active Effects are never copied to the Actor,
   // but will still apply to the Actor from within the Item
   // if the transfer property on the Active Effect is true.
   CONFIG.ActiveEffect.legacyTransferral = false;

   // Register sheet application classes
   Actors.unregisterSheet('core', ActorSheet);
   Actors.registerSheet('fantastic-depths', fadeActorSheet, {
      makeDefault: true,
      label: 'FADE.SheetLabel.Actor',
   });
   Items.unregisterSheet('core', ItemSheet);
   Items.registerSheet('fantastic-depths', fadeItemSheet, {
      makeDefault: true,
      label: 'FADE.SheetLabel.Item',
   });

   //const originalItemCreate = Item.create;
   //Item.create = async function (data, options) {
   //   try {
   //      const item = ItemFactory.createItem(data, options);
   //      console.log("Created item:", item);

   //      if (!(item instanceof Item)) {
   //         console.error("Item is not an instance of Item:", item);
   //         throw new Error("Item.create: ItemFactory did not return an instance of Item.");
   //      }

   //      // Convert the item to an object and log its structure
   //      const itemData = item.toObject();
   //      console.log("Item.toObject() result:", itemData);

   //      // Manually inspect and validate the item data before passing it to Foundry
   //      if (!itemData._id || !itemData.name || !itemData.type || !itemData.system) {
   //         throw new Error("Item.create: Missing required fields in item data.");
   //      }

   //      let created = await originalItemCreate.call(this, data, options);
   //      console.log("Item.create result:", created);
   //      return created;
   //   } catch (error) {
   //      console.error("Error during item creation:", error);
   //      throw error;
   //   }
   //};


   //const originalActorCreate = Actor.create;
   //Actor.create = async function (data, options) {
   //   const actor = ActorFactory.createActor(data, options);
   //   if (!(actor instanceof Actor)) throw new Error("Actor.create: ActorFactory did not return an instance of Actor.");
   //   console.log("Actor.create", actor.toObject());
   //   return originalActorCreate.call(this, actor.toObject(), options);
   //};

   // Preload Handlebars templates.
   return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('uppercase', function (str) {
   return str.toUpperCase();
});
Handlebars.registerHelper('lowercase', function (str) {
   return str.toLowerCase();
});
Handlebars.registerHelper("counter", (status, value, max) =>
   status
      ? Math.clamp((100 * value) / max, 0, 100)
      : Math.clamp(100 - (100 * value) / max, 0, 100)
);

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
   // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
   Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
   // First, determine if this is a valid owned item.
   if (data.type !== 'Item') return;
   if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
      return ui.notifications.warn(
         'You can only create macro buttons for owned Items'
      );
   }
   // If it is, retrieve it based on the uuid.
   const item = await Item.fromDropData(data);

   // Create the macro command using the uuid.
   const command = `game.fantasticdepths.rollItemMacro("${data.uuid}");`;
   let macro = game.macros.find(
      (m) => m.name === item.name && m.command === command
   );
   if (!macro) {
      macro = await Macro.create({
         name: item.name,
         type: 'script',
         img: item.img,
         command: command,
         flags: { 'fantastic-depths.itemMacro': true },
      });
   }
   game.user.assignHotbarMacro(macro, slot);
   return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
   // Reconstruct the drop data so that we can load the item.
   const dropData = {
      type: 'Item',
      uuid: itemUuid,
   };
   // Load the item from the uuid.
   Item.fromDropData(dropData).then((item) => {
      // Determine if the item loaded and if it's an owned item.
      if (!item || !item.parent) {
         const itemName = item?.name ?? itemUuid;
         return ui.notifications.warn(
            `Could not find item ${itemName}. You may need to delete and recreate this macro.`
         );
      }

      // Trigger the item roll
      item.roll();
   });
}