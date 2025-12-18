import { FDItemSheetV2 } from './FDItemSheetV2';
/**
 * Sheet class for ActorMasteryItem.
 */
export class ActorClassSheet extends FDItemSheetV2 {
    /**
     * Get the default options for the sheet.
     */
    static DEFAULT_OPTIONS = {
        window: {
            resizable: true,
            minimizable: false,
            contentClasses: ["scroll-body"]
        },
        classes: ['fantastic-depths', 'sheet', 'item'],
        position: {
            width: 540,
        },
        form: {
            submitOnChange: true
        }
    };
    static PARTS = {
        header: {
            template: "systems/fantastic-depths/templates/item/actorClass/header.hbs"
        }
    };
    /** @override */
    _configureRenderOptions(options) {
        // This fills in `options.parts` with an array of ALL part keys by default
        // So we need to call `super` first
        super._configureRenderOptions(options);
        // Completely overriding the parts
        options.parts = ['header'];
    }
    /**
     * Prepare data to be used in the Handlebars template.
     */
    async _prepareContext(options) {
        const context = {
            item: this.item,
            system: this.item.system,
            config: CONFIG.FADE,
            isGM: game.user.isGM
        };
        return context;
    }
}
