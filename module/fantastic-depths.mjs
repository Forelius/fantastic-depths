import { fadeSettings } from "./fadeSettings.mjs";
import { ActorFactory } from './actor/ActorFactory.mjs';
import { ItemFactory } from './item/ItemFactory.mjs';

import { CharacterDataModel } from './actor/dataModel/CharacterDataModel.mjs';
import { MonsterDataModel } from './actor/dataModel/MonsterDataModel.mjs';
import { fadeActor } from './actor/fadeActor.mjs';
import { CharacterActor } from './actor/CharacterActor.mjs';
import { MonsterActor } from './actor/MonsterActor.mjs';
import { fadeActorSheet } from './sheets/fadeActorSheet.mjs';
import { CharacterSheet } from './sheets/CharacterSheet.mjs';
import { MonsterSheet } from './sheets/MonsterSheet.mjs';

import { ClassItemDataModel } from './item/dataModel/ClassItemDataModel.mjs';
import { MasteryDefinitionItemDataModel } from "./item/dataModel/MasteryDefinitionItemDataModel.mjs";
import { ActorMasteryItemDataModel } from './item/dataModel/ActorMasteryItemDataModel.mjs';
import { fadeItemDataModel } from './item/dataModel/fadeItemDataModel.mjs';
import { ArmorItemDataModel } from './item/dataModel/ArmorItemDataModel.mjs';
import { SkillItemDataModel } from './item/dataModel/SkillItemDataModel.mjs';
import { SpellItemDataModel } from './item/dataModel/SpellItemDataModel.mjs';
import { WeaponItemDataModel } from './item/dataModel/WeaponItemDataModel.mjs';
import { SpecialAbilityDataModel } from './item/dataModel/SpecialAbilityDataModel.mjs';
import { ArmorItem } from './item/ArmorItem.mjs';
import { GearItemSheet } from './sheets/GearItemSheet.mjs';
import { WeaponItem } from './item/WeaponItem.mjs';
import { ActorMasterySheet } from './sheets/ActorMasterySheet.mjs';
import { ArmorItemSheet } from './sheets/ArmorItemSheet.mjs';
import { ClassItemSheet } from './sheets/ClassItemSheet.mjs';
import { MasteryDefinitionSheet } from './sheets/MasteryDefinitionSheet.mjs';
import { SkillItemSheet } from './sheets/SkillItemSheet.mjs';
import { SpecialAbilitySheet } from './sheets/SpecialAbilitySheet.mjs';
import { SpellItemSheet } from './sheets/SpellItemSheet.mjs';
import { WeaponItemSheet } from './sheets/WeaponItemSheet.mjs';

import { preloadHandlebarsTemplates } from './sys/templates.mjs';
import { FADE } from './sys/config.mjs';
import { fadeCombat } from './sys/fadeCombat.mjs'
import { TurnTrackerForm } from './apps/TurnTrackerForm.mjs';
import { PartyTrackerForm } from './apps/PartyTrackerForm.mjs';
import { MacroManager } from './sys/MacroManager.mjs';
import { LightManager } from './sys/LightManager.mjs';
import { fadeHandlebars } from './fadeHandlebars.mjs';
import { fadeDialog } from './dialog/fadeDialog.mjs';
import { DamageRollChatBuilder } from './chat/DamageRollChatBuilder.mjs';
import { AttackRollChatBuilder } from './chat/AttackRollChatBuilder.mjs';
import { DataMigrator } from './sys/migration.mjs';
import { EffectManager } from './sys/EffectManager.mjs';
import { EffectLibraryForm } from './apps/EffectLibraryForm.mjs';
import { ToastManager } from './sys/ToastManager.mjs';
import { Collapser } from './utils/collapser.mjs';
import {fadeChatMessage } from './sys/fadeChatMessage.mjs'
import { GMMessageSender } from './sys/GMMessageSender.mjs'
import { fadeCombatant } from './sys/fadeCombatant.mjs'
import { fadeEffect } from './sys/fadeEffect.mjs'

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
      ArmorItem,
      WeaponItem,
      MacroManager,
      LightManager,
      TurnTrackerForm,
      PartyTrackerForm,
      EffectLibraryForm,
      AttackRollChatBuilder,
      fadeDialog
   };

   CONFIG.time.roundTime = 10;

   // Add custom constants for configuration.
   CONFIG.FADE = FADE;

   CONFIG.ActiveEffect.documentClass = fadeEffect;
   CONFIG.Combat.documentClass = fadeCombat;
   CONFIG.ChatMessage.documentClass = fadeChatMessage;
   CONFIG.Actor.documentClass = ActorFactory;
   CONFIG.Actor.dataModels = {
      character: CharacterDataModel,
      monster: MonsterDataModel,
   };
   CONFIG.Item.documentClass = ItemFactory;
   CONFIG.Item.dataModels = {
      item: fadeItemDataModel,
      armor: ArmorItemDataModel,
      skill: SkillItemDataModel,
      spell: SpellItemDataModel,
      weapon: WeaponItemDataModel,
      mastery: ActorMasteryItemDataModel,
      class: ClassItemDataModel,
      weaponMastery: MasteryDefinitionItemDataModel,
      specialAbility: SpecialAbilityDataModel
   }
   //CONFIG.Combatant.documentClass = fadeCombatant;

   // Active Effects are never copied to the Actor,
   // but will still apply to the Actor from within the Item
   // if the transfer property on the Active Effect is true.
   CONFIG.ActiveEffect.legacyTransferral = false;

   registerSheets();

   await handleAsyncInit();

   // Preload Handlebars templates.
   return preloadHandlebarsTemplates();
});

function registerSheets() {
   // Register sheet application classes
   Actors.unregisterSheet('core', ActorSheet);
   Actors.registerSheet('fantastic-depths', CharacterSheet, {
      label: 'FADE.SheetLabel.Character',
      types: ['character'],
      makeDefault: true
   });
   Actors.registerSheet('fantastic-depths', MonsterSheet, {
      label: 'FADE.SheetLabel.Monster',
      types: ['monster'],
      makeDefault: true
   });
   Items.unregisterSheet('core', ItemSheet);
   Items.registerSheet('fantastic-depths', GearItemSheet, {
      label: 'FADE.SheetLabel.Item',
      makeDefault: true,
      types: ['item', 'treasure']
   });
   Items.registerSheet('fantastic-depths', ActorMasterySheet, {
      label: 'FADE.SheetLabel.ActorMasteryItem',
      types: ['mastery'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', ArmorItemSheet, {
      label: 'FADE.SheetLabel.ArmorItem',
      types: ['armor'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', ClassItemSheet, {
      label: 'FADE.SheetLabel.ClassItem',
      types: ['class'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', MasteryDefinitionSheet, {
      label: 'FADE.SheetLabel.MasteryDefinitionItem',
      types: ['weaponMastery'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', SkillItemSheet, {
      label: 'FADE.SheetLabel.SkillItem',
      types: ['skill'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', SpecialAbilitySheet, {
      label: 'FADE.SheetLabel.SpecialAbility',
      types: ['specialAbility'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', SpellItemSheet, {
      label: 'FADE.SheetLabel.SpellItem',
      types: ['spell'],
      makeDefault: true
   });
   Items.registerSheet('fantastic-depths', WeaponItemSheet, {
      label: 'FADE.SheetLabel.WeaponItem',
      types: ['weapon'],
      makeDefault: true
   });
}


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
   const migrator = new DataMigrator();
   await migrator.migrate();

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

   if (game.socket) {
      const toastsEnabled = game.settings.get(game.system.id, "toasts");
      if (toastsEnabled) {
         // Ensure that the socket is ready before using it
         window.toastManager = new ToastManager();
         game.socket.on(`system.${game.system.id}`, (data) => {
            if (data.action === 'showToast') {
               // Call the public method to create the toast
               window.toastManager.createToastFromSocket(data.message, data.type, data.useHtml);
               //handled = true;
            }
         });
      }

      GMMessageSender.SetupOnReady();
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
