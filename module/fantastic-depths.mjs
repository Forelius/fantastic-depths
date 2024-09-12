import { registerSystemSettings } from "./settings.mjs";
// Import document classes.
import { fadeActor } from './actor/fadeActor.mjs';
import { CharacterActor } from './actor/CharacterActor.mjs';
import { MonsterActor } from './actor/MonsterActor.mjs';
import { fadeItem } from './item/fadeItem.mjs';
import { ArmorItem } from './item/ArmorItem.mjs';
import { WeaponItem } from './item/WeaponItem.mjs';
import { ItemFactory } from './helpers/ItemFactory.mjs';
import { ActorFactory } from './helpers/ActorFactory.mjs';
// Import sheet classes.
import { fadeActorSheet } from './sheets/fadeActorSheet.mjs';
import { fadeItemSheet } from './sheets/fadeItemSheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FADE } from './helpers/config.mjs';
import { ChatFactory, CHAT_TYPE } from './chat/ChatFactory.mjs';

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

   //console.log("Roll Modes:", Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => { return { key: key, label: game.i18n.localize(value) }; }));

   // Preload Handlebars templates.
   return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */
// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('uppercase', function (str) { return str.toUpperCase(); });
Handlebars.registerHelper('lowercase', function (str) { return str.toLowerCase(); });
Handlebars.registerHelper("counter", (status, value, max) =>
   status
      ? Math.clamp((100 * value) / max, 0, 100)
      : Math.clamp(100 - (100 * value) / max, 0, 100)
);
Handlebars.registerHelper("times", (n, block) => {
   let accum = "";
   // eslint-disable-next-line no-plusplus
   for (let i = 0; i < n; ++i) accum += block.fn(i);
   return accum;
});
Handlebars.registerHelper("subtract", (lh, rh) => parseInt(lh, 10) - parseInt(rh, 10));
Handlebars.registerHelper('formatHitDice', function (hitDice) {
   // Regular expression to check for a dice specifier like d<number>
   const diceRegex = /\d*d\d+/;
   // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
   const modifierRegex = /([+\-*/]\d+)$/;

   // Check if the input contains a dice specifier
   if (diceRegex.test(hitDice)) {
      // If a dice specifier is found, return the original hitDice
      return hitDice;
   } else {
      // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
      const base = hitDice.replace(modifierRegex, ''); // Extract base number
      const modifier = hitDice.match(modifierRegex)?.[0] || ''; // Extract modifier (if any)

      // Append 'd8' to the base number, followed by the modifier
      return base + 'd8' + modifier;
   }
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once('ready', function () {
   // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
   Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

   // inline-roll handler
   $(document).on('click', '.damage-roll', async function (ev) {
      const element = ev.currentTarget;
      const dataset = element.dataset;

      // Custom behavior for damage rolls
      if (dataset.type === "damage") {
         ev.preventDefault(); // Prevent the default behavior
         ev.stopPropagation(); // Stop other handlers from triggering the event
         const { attackerid, attacker, target, weapon } = dataset;

         // Roll the damage and wait for the result
         const roll = new Roll(dataset.formula);
         await roll.evaluate(); // Wait for the roll result
         const damage = roll.total;
         let descData = target ? { attacker, target, weapon, damage } : { attacker, weapon, damage };
         dataset.resultstring = target ? game.i18n.format('FADE.Chat.damageFlavor1', descData) : game.i18n.format('FADE.Chat.damageFlavor2', descData);

         // Use the total damage amount in the flavor text
         //roll.toMessage({
         //   author: game.user.id,
         //   flavor: description,
         //});

         const chatData = {
            context: game.actors.get(attackerid),
            mdata: dataset,
            roll: roll,
         };
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
         builder.createChatMessage();
      }
   });
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
