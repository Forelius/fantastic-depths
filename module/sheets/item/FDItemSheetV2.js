import { fadeFinder } from "../../utils/finder";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import { EffectManager } from '../../sys/EffectManager';
/**
 * Base sheet class for FDItem.
 */
export class FDItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
    get title() {
        return this.item.knownNameGM;
    }
    static DEFAULT_OPTIONS = {
        classes: ['fantastic-depths', 'sheet', 'item'],
        actions: {
            deleteTag: FDItemSheetV2.#clickDeleteTag,
            createEffect: FDItemSheetV2.#clickEffect,
            editEffect: FDItemSheetV2.#clickEffect,
            deleteEffect: FDItemSheetV2.#clickEffect,
            toggleEffect: FDItemSheetV2.#clickEffect,
            editImage: FDItemSheetV2.#onEditImage
        }
    };
    /**
     * Prepare data to be used in the Handlebars template.
     */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const rollData = this.item.getRollData();
        // TODO: Remove after v12 support.
        const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;
        // Enrich description info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedDesc = await textEditorImp.enrichHTML(this.item.system.description, {
            secrets: this.document.isOwner,
            rollData,
            relativeTo: this.item,
        });
        if (this.item.system.unidentifiedDesc !== undefined) {
            context.enrichedUIDesc = await textEditorImp.enrichHTML(this.item.system.unidentifiedDesc, {
                secrets: this.document.isOwner,
                rollData,
                relativeTo: this.item,
            });
        }
        // Need this due to condition on template for showing enriched description.
        context.showIdentifiedText = game.user.isGM || this.item.system.isIdentified === true || this.item.system.unidentifiedDesc === undefined;
        context.item = this.item;
        context.system = this.item.system;
        context.config = CONFIG.FADE;
        context.isGM = game.user.isGM;
        return context;
    }
    /**
      * Actions performed after any render of the Application.
      * Post-render steps are not awaited by the render process.
      * @param {ApplicationRenderContext} context      Prepared context data
      * @param {RenderOptions} options                 Provided render options
      * @protected
      */
    _onRender(context, options) {
        if (this.isEditable) {
            const inputField = this.element.querySelector('input[data-action="addTag"]');
            inputField?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') { // Check if the Enter key is pressed
                    const value = event.target.value; // Get the value of the input
                    this.item.tagManager.pushTag(value); // Push the value to the tag manager
                }
            });
        }
    }
    _getActionOptions() {
        // Ability actions
        const abilityActions = [];
        abilityActions.push({ value: "none", text: game.i18n.localize("FADE.Chat.actions.none") });
        abilityActions.push({ value: "consume", text: game.i18n.localize("FADE.Chat.actions.consume") });
        abilityActions.push({ value: "cast", text: game.i18n.localize("FADE.Chat.actions.cast") });
        abilityActions.push({ value: "use", text: game.i18n.localize("FADE.Chat.actions.use") });
        return abilityActions.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
    }
    async _getSavingThrowOptions() {
        const saves = [];
        saves.push({ value: "", text: game.i18n.localize("None") });
        const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
        saves.push(...saveItems.map((save) => {
            return { value: save.system.customSaveCode, text: save.system.shortName };
        }));
        return saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
    }
    static async #clickEffect(event) {
        await EffectManager.onManageActiveEffect(event, this.item);
    }
    static #clickDeleteTag(event) {
        const tag = event.target.closest('.tag-delete').dataset.tag;
        this.item.tagManager.popTag(tag);
    }
    /**
    * Edit a Document image.
    * @this {DocumentSheetV2}
    * @type {ApplicationClickAction}
    */
    static async #onEditImage(_event, target) {
        if (target.nodeName !== "IMG") {
            throw new Error("The editImage action is available only for IMG elements.");
        }
        const attr = target.dataset.edit;
        const current = foundry.utils.getProperty(this.document._source, attr);
        const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
        const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
        const fp = new FilePicker({
            current,
            type: "image",
            redirectToRoot: defaultImage ? [defaultImage] : [],
            callback: path => {
                target.src = path;
                this.submit();
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        await fp.browse();
    }
}
