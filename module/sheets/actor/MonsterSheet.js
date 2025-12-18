import { FDActorSheetV2 } from "./FDActorSheetV2";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {FDActorSheetV2}
 */
// @ts-ignore
export class MonsterSheet extends FDActorSheetV2 {
    constructor(options = {}) {
        super(options);
        this.editScores = false;
    }
    static DEFAULT_OPTIONS = {
        position: {
            width: 650,
            height: 600,
        },
        form: {
            submitOnChange: true
        },
        classes: ["monster"],
        actions: {
            cycleAttackGroup: MonsterSheet.#clickAttackGroup
        }
    };
    static PARTS = {
        header: {
            template: "systems/fantastic-depths/templates/actor/monster/header.hbs",
        },
        tabnav: {
            template: "templates/generic/tab-navigation.hbs",
        },
        abilities: {
            template: "systems/fantastic-depths/templates/actor/monster/abilities.hbs",
        },
        items: {
            template: "systems/fantastic-depths/templates/actor/shared/items.hbs",
        },
        skills: {
            template: "systems/fantastic-depths/templates/actor/monster/skills.hbs",
        },
        spells: {
            template: "systems/fantastic-depths/templates/actor/shared/spellsMulti.hbs",
        },
        description: {
            template: "systems/fantastic-depths/templates/actor/monster/description.hbs",
        },
        effects: {
            template: "systems/fantastic-depths/templates/actor/shared/effects.hbs",
        },
        gmOnly: {
            template: "systems/fantastic-depths/templates/actor/monster/gmOnly.hbs",
        }
    };
    tabGroups = {
        primary: "abilities"
    };
    _configureRenderOptions(options) {
        // This fills in `options.parts` with an array of ALL part keys by default
        // So we need to call `super` first
        super._configureRenderOptions(options);
        // Completely overriding the parts
        options.parts = ["header", "tabnav", "abilities"];
        if (this.actor.testUserPermission(game.user, "OWNER")) {
            options.parts.push("items");
            options.parts.push("skills");
            if (this.actor.system.config.maxSpellLevel > 0) {
                options.parts.push("spells");
            }
            options.parts.push("description");
        }
        if (game.user.isGM) {
            options.parts.push("effects");
            options.parts.push("gmOnly");
        }
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.showExplTarget = game.settings.get(game.system.id, "showExplorationTarget");
        const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
        context.hasAbilityScores = abilityScoreSetting !== "none";
        context.hasAbilityScoreMods = abilityScoreSetting === "withmod";
        context.editScores = this.editScores;
        // Prepare the tabs.
        context.tabs = this.#getTabs();
        return context;
    }
    /**
    * Prepare an array of form header tabs.
    * @returns {Record<string, Partial<any>>}
    */
    #getTabs() {
        const group = "primary";
        // Default tab for first time it's rendered this session
        if (!this.tabGroups[group])
            this.tabGroups[group] = "abilities";
        const tabs = {
            abilities: { id: "abilities", group, label: "FADE.tabs.abilities" },
            description: { id: "description", group, label: "FADE.tabs.description" },
            effects: { id: "effects", group, label: "FADE.tabs.effects" },
        };
        if (this.actor.testUserPermission(game.user, "OWNER")) {
            tabs.items = { id: "items", group, label: "FADE.items" };
            tabs.skills = { id: "skills", group, label: "FADE.tabs.skills" };
        }
        if (this.actor.system.config.maxSpellLevel > 0) {
            tabs.spells = { id: "spells", group, label: "FADE.tabs.spells" };
        }
        if (game.user.isGM) {
            tabs.gmOnly = { id: "gmOnly", group, label: "FADE.tabs.gmOnly" };
        }
        for (const tab of Object.values(tabs)) {
            tab.active = this.tabGroups[tab.group] === tab.id;
            tab.cssClass = tab.active ? "active" : "";
        }
        return tabs;
    }
    static async #clickAttackGroup(event) {
        const dataset = event.target.dataset;
        // @ts-ignore
        const item = this._getItemFromActor(event);
        await item.update({ "system.attacks.group": (item.system.attacks.group + 1) % 6 });
    }
}
