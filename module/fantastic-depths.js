import { CodeMigrate } from "./sys/migration";
import { fadeFinder } from "./utils/finder";
import { fadeSettings } from "./fadeSettings";
import { ActorFactory } from "./actor/ActorFactory";
import { ItemFactory } from "./item/ItemFactory";
import { AddonIntegration } from "./sys/addonIntegration";
import { fadeRegistry } from "./sys/registry/fadeRegistry";
import { fadeCompendium } from "./sys/fadeCompendium";
import { CharacterDataModel } from "./actor/dataModel/CharacterDataModel";
import { MonsterDataModel } from "./actor/dataModel/MonsterDataModel";
import { FDVehicleDM } from "./actor/dataModel/FDVehicleDM";
import { FDCombatActor } from "./actor/FDCombatActor";
import { CharacterSheet } from "./sheets/actor/CharacterSheet";
import { CharacterSheetBase } from "./sheets/actor/CharacterSheetBase";
import { MonsterSheet } from "./sheets/actor/MonsterSheet";
import { FDVehicleSheet } from "./sheets/actor/FDVehicleSheet";
import { ClassDefinitionDataModel } from "./item/dataModel/ClassDefinitionDataModel";
import { MasteryDefinitionDataModel } from "./item/dataModel/MasteryDefinitionDataModel";
import { ActorMasteryItemDM } from "./item/dataModel/ActorMasteryItemDM";
import { ActorClassDataModel } from "./item/dataModel/ActorClassDataModel";
import { GearItemDataModel } from "./item/dataModel/GearItemDataModel";
import { ConditionItemDataModel } from "./item/dataModel/ConditionItemDataModel";
import { ArmorItemDataModel } from "./item/dataModel/ArmorItemDataModel";
import { SkillItemDataModel } from "./item/dataModel/SkillItemDataModel";
import { LightItemDataModel } from "./item/dataModel/LightItemDataModel";
import { AmmoItemDataModel } from "./item/dataModel/AmmoItemDataModel";
import { SpellItemDataModel } from "./item/dataModel/SpellItemDataModel";
import { WeaponItemDataModel } from "./item/dataModel/WeaponItemDataModel";
import { SpecialAbilityDataModel } from "./item/dataModel/SpecialAbilityDataModel";
import { AncestryDefinitionDM } from "./item/dataModel/AncestryDefinitionDM";
import { GearItemSheet } from "./sheets/item/GearItemSheet";
import { TreasureItemSheet } from "./sheets/item/TreasureItemSheet";
import { ActorClassSheet } from "./sheets/item/ActorClassSheet";
import { ActorMasterySheet } from "./sheets/item/ActorMasterySheet";
import { ArmorItemSheet } from "./sheets/item/ArmorItemSheet";
import { ClassDefinitionItemSheet } from "./sheets/item/ClassDefinitionItemSheet";
import { MasteryDefinitionSheet } from "./sheets/item/MasteryDefinitionSheet";
import { SkillItemSheet } from "./sheets/item/SkillItemSheet";
import { SpecialAbilitySheet } from "./sheets/item/SpecialAbilitySheet";
import { SpellItemSheet } from "./sheets/item/SpellItemSheet";
import { WeaponItemSheet } from "./sheets/item/WeaponItemSheet";
import { ConditionItemSheet } from "./sheets/item/ConditionItemSheet";
import { AmmoItemSheet } from "./sheets/item/AmmoItemSheet";
import { AncestryDefinitionSheet } from "./sheets/item/AncestryDefinitionSheet";
import { TurnTrackerForm } from "./apps/TurnTrackerForm";
import { PartyTrackerForm } from "./apps/PartyTrackerForm";
import { PlayerCombatForm } from "./apps/PlayerCombatForm";
import { preloadHandlebarsTemplates } from "./sys/templates";
import { FADE } from "./sys/config";
import { fadeCombat } from "./sys/combat/fadeCombat";
import { fadeCombatant } from "./sys/combat/fadeCombatant";
import { MacroManager } from "./sys/MacroManager";
import { LightManager } from "./sys/LightManager";
import { fadeHandlebars } from "./fadeHandlebars";
import { fadeDialog } from "./dialog/fadeDialog";
import { DamageRollChatBuilder } from "./chat/DamageRollChatBuilder";
import { AttackRollChatBuilder } from "./chat/AttackRollChatBuilder";
import { ConditionItem } from "./item/ConditionItem";
import { DataMigrator } from "./sys/migration";
import { EffectManager } from "./sys/EffectManager";
import { ToastManager } from "./sys/ToastManager";
import { Collapser } from "./utils/collapser";
import { fadeChatMessage } from "./sys/fadeChatMessage";
import { SocketManager } from "./sys/SocketManager";
import { fadeEffect } from "./sys/fadeEffect";
import { fadeTreasure } from "./utils/fadeTreasure";
/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once("init", async function () {
    // Add utility classes to the global game object so that they're more easily
    // accessible in global contexts.
    game.fade = {
        MacroManager,
        LightManager,
        TurnTrackerForm,
        PartyTrackerForm,
        AttackRollChatBuilder,
        fadeDialog,
        DataMigrator,
        PlayerCombatForm,
        fadeTreasure,
        fadeFinder,
        registry: new fadeRegistry(),
    };
    Hooks.call("beforeFadeInit", game.fadeRegistry);
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
        vehicle: FDVehicleDM
    };
    CONFIG.Item.documentClass = ItemFactory;
    CONFIG.Item.dataModels = {
        treasure: GearItemDataModel,
        item: GearItemDataModel,
        armor: ArmorItemDataModel,
        skill: SkillItemDataModel,
        light: LightItemDataModel,
        ammo: AmmoItemDataModel,
        spell: SpellItemDataModel,
        weapon: WeaponItemDataModel,
        mastery: ActorMasteryItemDM,
        actorClass: ActorClassDataModel,
        class: ClassDefinitionDataModel,
        weaponMastery: MasteryDefinitionDataModel,
        specialAbility: SpecialAbilityDataModel,
        condition: ConditionItemDataModel,
        species: AncestryDefinitionDM
    };
    // Active Effects are never copied to the Actor,
    // but will still apply to the Actor from within the Item
    // if the transfer property on the Active Effect is true.
    CONFIG.ActiveEffect.legacyTransferral = false;
    registerSheets();
    // Register System Settings
    const settings = new fadeSettings();
    settings.RegisterSystemSettings();
    // Hook into the rendering of the settings form
    Hooks.on("renderSettingsConfig", (app, html, data) => settings.renderSettingsConfig(app, html, data));
    game.fade.registry.registerDefaultSystems();
    await handleAsyncInit();
    Hooks.call("afterFadeInit", game.fade.registry);
});
function registerSheets() {
    // TODO: Remove after v12 support.
    const gActors = foundry?.documents?.collections?.Actors ? foundry.documents.collections.Actors : Actors;
    const gItems = foundry?.documents?.collections?.Items ? foundry.documents.collections.Items : Items;
    // Register sheet application classes
    // TODO: Remove after v12 support.
    const gActorSheet = foundry?.appv1?.sheets?.ActorSheet ? foundry.appv1.sheets.ActorSheet : ActorSheet;
    gActors.unregisterSheet("core", gActorSheet);
    gActors.registerSheet("fantastic-depths", CharacterSheet, {
        label: "FADE.SheetLabel.Character",
        types: ["character"],
        makeDefault: true
    });
    gActors.registerSheet("fantastic-depths", CharacterSheetBase, {
        label: "FADE.SheetLabel.CharacterSheetBase",
        types: ["character"],
        makeDefault: false
    });
    gActors.registerSheet("fantastic-depths", MonsterSheet, {
        label: "FADE.SheetLabel.Monster",
        types: ["monster"],
        makeDefault: true
    });
    gActors.registerSheet("fantastic-depths", FDVehicleSheet, {
        label: "FADE.SheetLabel.Vehicle",
        types: ["vehicle"],
        makeDefault: true
    });
    // TODO: Remove after v12 support.
    const gItemSheet = foundry?.appv1?.sheets?.ItemSheet ? foundry.appv1.sheets.ItemSheet : ItemSheet;
    gItems.unregisterSheet("core", gItemSheet);
    gItems.registerSheet("fantastic-depths", GearItemSheet, {
        label: "FADE.SheetLabel.Item",
        makeDefault: true,
        types: ["item", "light"]
    });
    gItems.registerSheet("fantastic-depths", TreasureItemSheet, {
        label: "FADE.SheetLabel.TreasureItem",
        makeDefault: true,
        types: ["treasure"]
    });
    gItems.registerSheet("fantastic-depths", ActorClassSheet, {
        label: "FADE.SheetLabel.ActorClassItem",
        types: ["actorClass"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", ActorMasterySheet, {
        label: "FADE.SheetLabel.ActorMasteryItem",
        types: ["mastery"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", ArmorItemSheet, {
        label: "FADE.SheetLabel.ArmorItem",
        types: ["armor"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", ClassDefinitionItemSheet, {
        label: "FADE.SheetLabel.ClassDefinitionItem",
        types: ["class"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", MasteryDefinitionSheet, {
        label: "FADE.SheetLabel.MasteryDefinitionItem",
        types: ["weaponMastery"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", SkillItemSheet, {
        label: "FADE.SheetLabel.SkillItem",
        types: ["skill"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", SpecialAbilitySheet, {
        label: "FADE.SheetLabel.SpecialAbilityItem",
        types: ["specialAbility"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", SpellItemSheet, {
        label: "FADE.SheetLabel.SpellItem",
        types: ["spell"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", WeaponItemSheet, {
        label: "FADE.SheetLabel.WeaponItem",
        types: ["weapon"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", ConditionItemSheet, {
        label: "FADE.SheetLabel.ConditionItem",
        types: ["condition"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", AmmoItemSheet, {
        label: "FADE.SheetLabel.AmmoItem",
        types: ["ammo"],
        makeDefault: true
    });
    gItems.registerSheet("fantastic-depths", AncestryDefinitionSheet, {
        label: "FADE.SheetLabel.AncestryDefinitionItem",
        types: ["species"],
        makeDefault: true
    });
}
async function handleAsyncInit() {
    //const fxMgr = new EffectManager();
    //await fxMgr.OnGameInit();
    // Preload Handlebars templates.
    await preloadHandlebarsTemplates();
}
Hooks.once("setup", () => {
    // Apply custom item compendium
    game.packs.filter(p => p.metadata.type === "Item")
        .forEach(p => p.applicationClass = fadeCompendium);
});
/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once("ready", async () => {
    Hooks.call("beforeFadeReady", game.fadeRegistry);
    const migrator = new DataMigrator();
    await migrator.migrate();
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => {
        MacroManager.createItemMacro(data, slot);
        // Returning false to stop the rest of hotbarDrop handling.
        return false;
    });
    LightManager.initialize();
    // inline-roll handler
    $(document).on("click", ".damage-roll,.heal-roll", DamageRollChatBuilder.clickDamageRoll);
    $(document).on("click", ".apply-damage, .apply-heal", DamageRollChatBuilder.clickApplyDamage);
    $(document).on("click", ".apply-condition", async (event) => await ConditionItem.clickApplyCondition(event));
    $(document).on("click", ".remove-condition", async (event) => await ConditionItem.clickRemoveCondition(event));
    $(document).on("click", ".collapser", Collapser.toggleCollapsibleContent);
    $(document).on("click", ".saving-roll", FDCombatActor.handleSavingThrowRequest);
    $(document).on("click", ".action-roll, .spell-cast, .attack-roll", FDCombatActor.handleActionRoll);
    const fxMgr = new EffectManager();
    await fxMgr.OnGameReady();
    if (game.socket) {
        game.fade.SocketManager = new SocketManager();
        const toastsEnabled = game.settings.get(game.system.id, "toasts");
        if (toastsEnabled) {
            // Ensure that the socket is ready before using it
            game.fade.toastManager = new ToastManager();
            game.socket.on(`system.${game.system.id}`, (data) => {
                //console.debug("onSocketReceived", data);
                if (data.action === "showToast") {
                    // Call the public method to create the toast
                    game.fade.toastManager.createToastFromSocket(data.message, data.type, data.useHtml);
                }
                else {
                    game.fade.SocketManager.receiveSocketMessage(data);
                }
            });
            console.info(`Registered socket listener: system.${game.system.id}`);
        }
    }
    else {
        console.warn(`Game socket not found: system.${game.system.id}`);
    }
    // Set the length of a round of combat.
    CONFIG.time.roundTime = game.settings.get(game.system.id, "roundDurationSec") ?? 10;
    if (game.user.isGM === true) {
        /* Hook for time advancement. */
        Hooks.on("updateWorldTime", async (worldTime, dt, options, userId) => {
            if (game.user.isGM === true) {
                await LightManager.onUpdateWorldTime(worldTime, dt, options, userId);
                //console.debug("updateWorldTime", worldTime, dt, options, userId);
                const placeables = canvas?.tokens.placeables;
                for (let placeable of placeables) {
                    const token = placeable.document;
                    if (token.actor) { // Only process tokens with an actor
                        token.actor.onUpdateWorldTime(worldTime, dt, options, userId); // Correctly call the actor's method
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
        Hooks.on("createItem", async (item, options, userId) => {
            if (game.user.isGM) {
                const actor = item.parent; // The actor the item belongs to
                await actor?.onCreateActorItem(item, options, userId);
            }
        });
        // Hook into item updates (e.g., changes to an existing item)
        Hooks.on("updateItem", async (item, updateData, options, userId) => {
            if (game.user.isGM) {
                const actor = item.parent; // The actor the item belongs to
                await actor?.onUpdateActorItem(item, updateData, options, userId);
            }
        });
        // Hook into item deletion (removed from the actor)
        Hooks.on("deleteItem", (item, options, userId) => {
            if (game.user.isGM) {
                const actor = item.parent; // The actor the item belongs to
                actor?.onDeleteActorItem(item, options, userId);
            }
        });
    }
    Hooks.call("afterFadeReady", game.fadeRegistry);
});
AddonIntegration.setupItemPiles();
fadeHandlebars.registerHelpers();
fadeCombat.initialize();
// License info
Hooks.on("renderSidebarTab", async (object, html) => {
    if (object instanceof Settings) {
        const gamesystem = html.find("#game-details");
        const template = `/systems/fantastic-depths/templates/sidebar/general-info.hbs`;
        const rendered = await CodeMigrate.RenderTemplate(template);
        gamesystem.find(".system").after(rendered);
    }
});
