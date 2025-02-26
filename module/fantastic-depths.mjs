import { fadeSettings } from "./fadeSettings.mjs";
import { ActorFactory } from './actor/ActorFactory.mjs';
import { ItemFactory } from './item/ItemFactory.mjs';

import { CharacterDataModel } from './actor/dataModel/CharacterDataModel.mjs';
import { MonsterDataModel } from './actor/dataModel/MonsterDataModel.mjs';
import { fadeActor } from './actor/fadeActor.mjs';
import { CharacterActor } from './actor/CharacterActor.mjs';
import { MonsterActor } from './actor/MonsterActor.mjs';
import { CharacterSheet } from './sheets/CharacterSheet.mjs';
import { CharacterSheet2 } from './sheets/CharacterSheet2.mjs';
import { MonsterSheet } from './sheets/MonsterSheet.mjs';

import { ClassItemDataModel } from './item/dataModel/ClassItemDataModel.mjs';
import { MasteryDefinitionItemDataModel } from "./item/dataModel/MasteryDefinitionItemDataModel.mjs";
import { ActorMasteryItemDataModel } from './item/dataModel/ActorMasteryItemDataModel.mjs';
import { GearItemDataModel } from './item/dataModel/GearItemDataModel.mjs';
import { ConditionItemDataModel } from './item/dataModel/ConditionItemDataModel.mjs';
import { ArmorItemDataModel } from './item/dataModel/ArmorItemDataModel.mjs';
import { SkillItemDataModel } from './item/dataModel/SkillItemDataModel.mjs';
import { LightItemDataModel } from './item/dataModel/LightItemDataModel.mjs';
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
import { ConditionItemSheet } from './sheets/ConditionItemSheet.mjs';

import { TurnTrackerForm } from './apps/TurnTrackerForm.mjs';
import { PartyTrackerForm } from './apps/PartyTrackerForm.mjs';
import { PlayerCombatForm } from './apps/PlayerCombatForm.mjs';
import { EffectLibraryForm } from './apps/EffectLibraryForm.mjs';
import { preloadHandlebarsTemplates } from './sys/templates.mjs';
import { FADE } from './sys/config.mjs';
import { fadeCombat } from './sys/combat/fadeCombat.mjs'
import { fadeCombatant } from './sys/combat/fadeCombatant.mjs'
import { MacroManager } from './sys/MacroManager.mjs';
import { LightManager } from './sys/LightManager.mjs';
import { Wrestling } from './sys/combat/Wrestling.mjs';
import { Shove } from './sys/combat/Shove.mjs';
import { fadeHandlebars } from './fadeHandlebars.mjs';
import { fadeDialog } from './dialog/fadeDialog.mjs';
import { DamageRollChatBuilder } from './chat/DamageRollChatBuilder.mjs';
import { AttackRollChatBuilder } from './chat/AttackRollChatBuilder.mjs';
import { DataMigrator } from './sys/migration.mjs';
import { EffectManager } from './sys/EffectManager.mjs';
import { ToastManager } from './sys/ToastManager.mjs';
import { Collapser } from './utils/collapser.mjs';
import { fadeChatMessage } from './sys/fadeChatMessage.mjs'
import { SocketManager } from './sys/SocketManager.mjs'
import { fadeEffect } from './sys/fadeEffect.mjs'
import { fadeTreasure } from './utils/fadeTreasure.mjs'

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
      fadeDialog,
      DataMigrator,
      Wrestling,
      Shove,
      PlayerCombatForm,
      fadeTreasure
   };

   CONFIG.time.roundTime = 10;

   // Add custom constants for configuration.
   CONFIG.FADE = FADE;

   CONFIG.ActiveEffect.documentClass = fadeEffect;
   CONFIG.Combat.documentClass = fadeCombat;
   CONFIG.Combatant.documentClass = fadeCombatant;
   CONFIG.ChatMessage.documentClass = fadeChatMessage;
   CONFIG.Actor.documentClass = ActorFactory;
   CONFIG.Actor.dataModels = {
      character: CharacterDataModel,
      monster: MonsterDataModel,
   };
   CONFIG.Item.documentClass = ItemFactory;
   CONFIG.Item.dataModels = {
      item: GearItemDataModel,
      armor: ArmorItemDataModel,
      skill: SkillItemDataModel,
      light: LightItemDataModel,
      spell: SpellItemDataModel,
      weapon: WeaponItemDataModel,
      mastery: ActorMasteryItemDataModel,
      class: ClassItemDataModel,
      weaponMastery: MasteryDefinitionItemDataModel,
      specialAbility: SpecialAbilityDataModel,
      effect: ConditionItemDataModel
   }

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
   Actors.registerSheet('fantastic-depths', CharacterSheet2, {
      label: 'FADE.SheetLabel.Character2',
      types: ['character'],
      makeDefault: false
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
      types: ['item', 'treasure', 'light']
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
      label: 'FADE.SheetLabel.SpecialAbilityItem',
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
   Items.registerSheet('fantastic-depths', ConditionItemSheet, {
      label: 'FADE.SheetLabel.ConditionItem',
      types: ['condition'],
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
         game.fade.toastManager = new ToastManager();
         game.fade.SocketManager = new SocketManager();
         
         game.socket.on(`system.${game.system.id}`, (data) => {
            //console.debug("onSocketReceived", data);
            if (data.action === 'showToast') {
               // Call the public method to create the toast
               game.fade.toastManager.createToastFromSocket(data.message, data.type, data.useHtml);
            } else {
               game.fade.SocketManager.receiveSocketMessage(data)
            }
         });
         console.info(`Registered socket listener: system.${game.system.id}`);
      }
   }
});

fadeHandlebars.registerHelpers();

fadeCombat.initialize();
/**
 * Hook for time advancement.
 */
Hooks.on('updateWorldTime', async (worldTime, dt, options, userId) => {
   if (game.user.isGM === true) {
      await LightManager.onUpdateWorldTime(worldTime, dt, options, userId);
      //console.debug("updateWorldTime", worldTime, dt, options, userId);
      const placeables = canvas?.tokens.placeables;
      for (let placeable of placeables) {
         const token = placeable.document;
         if (token.actor) {  // Only process tokens with an actor
            token.actor.onUpdateWorldTime(worldTime, dt, options, userId);  // Correctly call the actor's method
         }
      }
   }
});

/* -------------------------------------------- */
/*  Log Changes                                 */
/* -------------------------------------------- */
// Hook into `updateActor` to compare the old and new values
Hooks.on("updateActor", async (actor, updateData, options, userId) => {
   if (game.user.isGM) {
      await actor?.onUpdateActor(updateData, options, userId);
   }
});

// Hook into item creation (added to the actor)
Hooks.on("createItem", (item, options, userId) => {
   if (game.user.isGM) {
      const actor = item.parent; // The actor the item belongs to
      actor?.onCreateActorItem(item, options, userId);
   }
});

// Hook into item updates (e.g., changes to an existing item)
Hooks.on("updateItem", (item, updateData, options, userId) => {
   if (game.user.isGM) {
      const actor = item.parent; // The actor the item belongs to
      actor?.onUpdateActorItem(item, updateData, options, userId);
   }
});

// Hook into item deletion (removed from the actor)
Hooks.on("deleteItem", (item, options, userId) => {
   if (game.user.isGM) {
      const actor = item.parent; // The actor the item belongs to
      actor?.onDeleteActorItem(item, options, userId);
   }
});