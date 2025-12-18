import { DragDropMixin } from "../mixins/DragDropMixin";
import { ConditionMixin } from "../mixins/ConditionMixin";
import { FDItemSheetV2 } from "./FDItemSheetV2";
import { EffectManager } from "../../sys/EffectManager";
import { fadeFinder } from "../../utils/finder";
/**
 * Sheet class for SpecialAbilityItem.
 */
// @ts-ignore
export class SpecialAbilitySheet extends ConditionMixin(DragDropMixin(FDItemSheetV2)) {
    /**
    * Get the default options for the sheet.
    */
    static DEFAULT_OPTIONS = {
        position: {
            width: 580,
            height: 420,
        },
        window: {
            resizable: true,
            minimizable: false,
            contentClasses: ["scroll-body"]
        },
        classes: ["fantastic-depths", "sheet", "item"],
        form: {
            submitOnChange: true
        }
    };
    static PARTS = {
        header: {
            template: "systems/fantastic-depths/templates/item/specialAbility/header.hbs",
        },
        tabnav: {
            template: "templates/generic/tab-navigation.hbs",
        },
        description: {
            template: "systems/fantastic-depths/templates/item/shared/description.hbs",
        },
        attributes: {
            template: "systems/fantastic-depths/templates/item/specialAbility/attributes.hbs",
        },
        effects: {
            template: "systems/fantastic-depths/templates/item/shared/conditionswd.hbs",
        }
    };
    tabGroups = {
        primary: "description"
    };
    _configureRenderOptions(options) {
        // This fills in `options.parts` with an array of ALL part keys by default
        // So we need to call `super` first
        super._configureRenderOptions(options);
        // Completely overriding the parts
        options.parts = ["header", "tabnav", "description", "attributes"];
        if (game.user.isGM) {
            options.parts.push("effects");
        }
    }
    /**
     * Prepare data to be used in the Handlebars template.
     */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        // Damage types
        const damageTypes = [];
        damageTypes.push({ value: "", text: game.i18n.localize("None") });
        damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) };
        }));
        context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
        // Saving throws
        const saves = [];
        saves.push({ value: "", text: game.i18n.localize("None") });
        const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
        saves.push(...saveItems.map((save) => {
            return { value: save.system.customSaveCode, text: save.system.shortName };
        }));
        context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
        // Prepare roll modes select options
        context.rollModes = Object.entries(CONFIG.Dice.rollModes).reduce((acc, [key, value]) => {
            acc[key] = game.i18n.localize(value?.label ?? value); // cause v12 and v13 different
            return acc;
        }, {});
        // Prepare operators
        context.operators = Object.entries(CONFIG.FADE.Operators).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
        // Ability score types
        const abilities = [];
        abilities.push({ value: "", text: game.i18n.localize("None") });
        abilities.push(...CONFIG.FADE.Abilities.map((key) => {
            return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.abbr`) };
        }).sort((a, b) => a.text.localeCompare(b.text)));
        context.abilities = abilities.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
        // Categories
        const categories = [];
        categories.push({ value: "", text: game.i18n.localize("None") });
        categories.push(...CONFIG.FADE.SpecialAbilityCategories.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.SpecialAbility.categories.${type}`) };
        }).sort((a, b) => a.text.localeCompare(b.text)));
        context.categories = categories.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
        ;
        // Combat Maneuvers
        const combatManeuvers = [];
        combatManeuvers.push({ value: null, text: game.i18n.localize("None") });
        combatManeuvers.push(...Object.entries(CONFIG.FADE.CombatManeuvers)
            .filter((action) => action[1].classes?.length > 0)
            .map((action) => {
            return { value: action[0], text: game.i18n.localize(`FADE.combat.maneuvers.${action[0]}.name`) };
        }).sort((a, b) => a.text.localeCompare(b.text)));
        context.combatManeuvers = combatManeuvers.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
        ;
        // Prepare the tabs.
        context.tabs = this.#getTabs();
        // Prepare active effects for easier access
        context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
        return context;
    }
    async _onDrop(event) {
        if (!this.item.isOwner)
            return false;
        const data = TextEditor.getDragEventData(event);
        const droppedItem = await Item.implementation.fromDropData(data);
        // If the dropped item is a weapon mastery definition item...
        if (droppedItem.type === "condition") {
            // Retrieve the array
            await this.onDropConditionItem(droppedItem);
        }
    }
    /**
    * Prepare an array of form header tabs.
    * @returns {Record<string, Partial<any>>}
    */
    #getTabs() {
        const group = "primary";
        // Default tab for first time it"s rendered this session
        if (!this.tabGroups[group])
            this.tabGroups[group] = "description";
        const tabs = {
            description: { id: "description", group, label: "FADE.tabs.description", cssClass: "item" },
            attributes: { id: "attributes", group, label: "FADE.tabs.attributes", cssClass: "item" }
        };
        if (game.user.isGM) {
            tabs.effects = { id: "effects", group, label: "FADE.tabs.effects", cssClass: "item" };
        }
        for (const v of Object.values(tabs)) {
            v.active = this.tabGroups[v.group] === v.id;
            v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }
}
