import { fadeSettings } from "./fadeSettings.mjs";
// Import document classes.
import { ActorFactory } from './actor/ActorFactory.mjs';
import { fadeActor } from './actor/fadeActor.mjs';
import { CharacterActor } from './actor/CharacterActor.mjs';
import { MonsterActor } from './actor/MonsterActor.mjs';
import { fadeItem } from './item/fadeItem.mjs';
import { ArmorItem } from './item/ArmorItem.mjs';
import { WeaponItem } from './item/WeaponItem.mjs';
import { ItemFactory } from './item/ItemFactory.mjs';
// Import sheet classes.
import { fadeActorSheet } from './sheets/fadeActorSheet.mjs';
import { fadeItemSheet } from './sheets/fadeItemSheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './sys/templates.mjs';
import { FADE } from './sys/config.mjs';
import { ChatFactory, CHAT_TYPE } from './chat/ChatFactory.mjs';
import { fadeCombat } from './sys/fadeCombat.mjs'
// Import TurnTrackerForm class
import { TurnTrackerForm } from './apps/TurnTrackerForm.mjs';
import { PartyTrackerForm } from './apps/PartyTrackerForm.mjs';
import { MacroManager } from './sys/MacroManager.mjs';
import { LightManager } from './sys/LightManager.mjs';
import { fadeHandlebars } from './fadeHandlebars.mjs';
import { ContentImporter } from './sys/ContentImporter.mjs';
import { fadeDialog } from './dialog/fadeDialog.mjs';
import { DamageRollChatBuilder } from './chat/DamageRollChatBuilder.mjs';
import { migrateData } from './sys/migration.mjs';
import { EffectManager } from './sys/EffectManager.mjs';
import { EffectLibraryForm } from './apps/EffectLibraryForm.mjs';
import { ToastManager } from './sys/ToastManager.mjs';
import { Collapser } from './utils/collapser.mjs';
import {fadeChatMessage } from './sys/fadeChatMessage.mjs'

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function () {
   // Add utility classes to the global game object so that they're more easily
   // accessible in global contexts.
   game.fade = {
      fadeActor,
      CharacterActor,
      MonsterActor,
      fadeItem,
      ArmorItem,
      WeaponItem,
      MacroManager,
      LightManager,
      TurnTrackerForm,
      PartyTrackerForm,
      EffectLibraryForm,
      ContentImporter,
      fadeDialog
   };

   CONFIG.time.roundTime = 10;

   // Add custom constants for configuration.
   CONFIG.FADE = FADE;

    // Replace the default Combat class with the custom fadeCombat class
   CONFIG.Combat.documentClass = fadeCombat;

   // Define custom Document classes
   CONFIG.ChatMessage.documentClass = fadeChatMessage;
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

   await handleAsyncInit();

   // Preload Handlebars templates.
   return preloadHandlebarsTemplates();
});

async function handleAsyncInit() {
   // Register System Settings
   const settings = new fadeSettings();
   await settings.RegisterSystemSettings();
   // Hook into the rendering of the settings form
   Hooks.on("renderSettingsConfig", (app, html, data) => settings.renderSettingsConfig(app, html, data));

   const fxMgr = new EffectManager();
   await fxMgr.OnGameInit();
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once('ready', async function () {
   migrateData();

   // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
   Hooks.on('hotbarDrop', (bar, data, slot) => {
      MacroManager.createItemMacro(data, slot);
      return false;
   });

   if (game.user.isGM) {
      await MacroManager.createAllMacros();
   }

   LightManager.initialize();

   // inline-roll handler
   $(document).on('click', '.damage-roll,.heal-roll', DamageRollChatBuilder.clickDamageRoll);
   $(document).on('click', '.apply-damage, .apply-heal', DamageRollChatBuilder.clickApplyDamage);
   $(document).on('click', '.collapser', Collapser.toggleCollapsibleContent);
   $(document).on('click', '.saving-roll', fadeActor.handleSavingThrowRequest);

   const fxMgr = new EffectManager();
   await fxMgr.OnGameReady();

   const toastsEnabled = game.settings.get(game.system.id, "toasts");
   if (toastsEnabled && game.socket) {
      // Ensure that the socket is ready before using it
      window.toastManager = new ToastManager();
      game.socket.on(`system.${game.system.id}`, (data) => {
         if (data.action === 'showToast') {
            // Call the public method to create the toast
            window.toastManager.createToastFromSocket(data.message, data.type, data.useHtml);
         }
      });
   }
});

fadeHandlebars.registerHelpers();

/**
 * Hook for time advancement.
 */
Hooks.on('updateWorldTime', (worldTime, dt, options, userId) => {
   //console.debug("updateWorldTime", worldTime, dt, options, userId);
   const tokens = canvas?.tokens.placeables;
   for (let token of tokens) {
      if (token.actor) {  // Only process tokens with an actor
         token.actor.onUpdateWorldTime();  // Correctly call the actor's method
      }
   }
});

/* -------------------------------------------- */
/*  Render Sidebar Hook                         */
/* -------------------------------------------- */
// Hook to add the "Turn Tracker" button in the sidebar for the GM
Hooks.on('renderSidebarTab', (app, html) => {
   if (game.user.isGM) {
   }
});

/* -------------------------------------------- */
/*  Log Changes                                 */
/* -------------------------------------------- */

// Hook into `updateActor` to compare the old and new values
Hooks.on("updateActor", async (actor, updateData, options, userId) => {
   actor.updateActor(updateData, options, userId);
});

// Hook into item creation (added to the actor)
Hooks.on("createItem", async (item, options, userId) => {
   const actor = item.parent; // The actor the item belongs to
   const user = game.users.get(userId);
   // Check if the logging feature is enabled and the user is not a GM
   const isLoggingEnabled = await game.settings.get(game.system.id, "logCharacterChanges");
   if (isLoggingEnabled && game.user.isGM && (actor instanceof CharacterActor)) {
      actor.logActorChanges(item, null, user, "addItem");
   }
});

// Hook into item updates (e.g., changes to an existing item)
Hooks.on("updateItem",async (item, updateData, options, userId) => {
   const actor = item.parent; // The actor the item belongs to
   const user = game.users.get(userId);
   // Check if the logging feature is enabled and the user is not a GM
   const isLoggingEnabled = await game.settings.get(game.system.id, "logCharacterChanges");
   if (isLoggingEnabled && game.user.isGM && (actor instanceof CharacterActor)) {
      // Log the item update and notify the GM
      console.log(`Item updated: ${item.name} by ${game.users.get(userId).name}`);     
   }
});

// Hook into item deletion (removed from the actor)
Hooks.on("deleteItem", async (item, options, userId) => {
   const actor = item.parent; // The actor the item belongs to
   const user = game.users.get(userId);
   // Check if the logging feature is enabled and the user is not a GM
   const isLoggingEnabled = await game.settings.get(game.system.id, "logCharacterChanges");
   if (isLoggingEnabled && game.user.isGM && (actor instanceof CharacterActor)) {
      
      // Log the item removal and notify the GM
      console.log(`Item removed: ${item.name} by ${game.users.get(userId).name}`);

      actor.logActorChanges(item, null, user, "deleteItem");
   }
});