import { EffectManager } from "../../sys/EffectManager";
import { FDItemSheetV2 } from "./FDItemSheetV2";
export class TreasureItemSheet extends FDItemSheetV2 {
    /**
     * Get the default options for the sheet.
     */
    static DEFAULT_OPTIONS = {
        position: {
            width: 570,
            height: 350,
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
            template: "systems/fantastic-depths/templates/item/treasure/header.hbs",
        },
        tabnav: {
            template: "templates/generic/tab-navigation.hbs",
        },
        description: {
            template: "systems/fantastic-depths/templates/item/shared/description.hbs",
        },
        attributes: {
            template: "systems/fantastic-depths/templates/item/treasure/attributes.hbs",
        },
        effects: {
            template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
        },
        gmOnly: {
            template: "systems/fantastic-depths/templates/item/shared/gmOnly.hbs",
        }
    };
    /** @override */
    tabGroups = {
        primary: "description"
    };
    /** @override */
    _configureRenderOptions(options) {
        // This fills in `options.parts` with an array of ALL part keys by default
        // So we need to call `super` first
        super._configureRenderOptions(options);
        // Completely overriding the parts
        options.parts = ["header", "tabnav", "description"];
        if (game.user.isGM) {
            options.parts.push("attributes");
            options.parts.push("effects");
            options.parts.push("gmOnly");
        }
    }
    /** @override */
    async _prepareContext(options) {
        // Retrieve base data structure.
        const context = await super._prepareContext(options);
        // Prepare the tabs.
        context.tabs = this.#getTabs();
        // Prepare active effects for easier access
        context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
        return context;
    }
    /**
    * Prepare an array of form header tabs.
    * @returns {Record<string, Partial<ApplicationTab>>}
    */
    #getTabs() {
        const group = "primary";
        // Default tab for first time it's rendered this session
        if (!this.tabGroups[group])
            this.tabGroups[group] = "description";
        const tabs = {
            description: { id: "description", group, label: "FADE.tabs.description", cssClass: "item" },
        };
        if (game.user.isGM) {
            tabs.attributes = { id: "attributes", group, label: "FADE.tabs.attributes", cssClass: "item" };
            tabs.effects = { id: "effects", group, label: "FADE.tabs.effects", cssClass: "item" };
            tabs.gmOnly = { id: "gmOnly", group, label: "FADE.tabs.gmOnly", cssClass: "item" };
        }
        for (const v of Object.values(tabs)) {
            v.active = this.tabGroups[v.group] === v.id;
            v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }
}
