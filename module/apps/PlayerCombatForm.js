export class PlayerCombatForm extends FormApplication {
    static APP_ID = "party-combat-form";
    constructor(object = {}, options = {}) {
        super(object, options);
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = PlayerCombatForm.APP_ID;
        options.template = `systems/${game.system.id}/templates/apps/player-combat.hbs`;
        options.width = 350;
        options.height = 300;
        options.resizable = true;
        options.title = game.i18n.localize("FADE.apps.playerCombat.title");
        options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
        return options;
    }
    get trackedTokenIds() {
        return game.combat?.ownedCombatants.map(combatant => combatant.token?.id).filter(id => id);
    }
    /**
     * Fetch data for the form, such as tracked actors
     */
    getData() {
        const context = super.getData();
        context.ownedCombatants = game.combat.ownedCombatants;
        context.heroicMastery = game.settings.get(game.system.id, "weaponMastery") === "heroic";
        return context;
    }
    /**
     * override
     * @param {any} html
     */
    activateListeners(html) {
        super.activateListeners(html);
        // Listen for changes in the action select elements
        html.find('[name="declaredAction"]').on("change", this.#onPlayerChangedAction);
        Hooks.on('updateActor', this._updateTrackedActor);
        Hooks.on("updateCombatant", this.#updateCombatant);
        Hooks.on("updateItem", this.#updateItem);
    }
    // Optionally handle close actions
    close(options) {
        Hooks.off('updateActor', this._updateTrackedActor);
        Hooks.off("updateCombatant", this.#updateCombatant);
        Hooks.off("updateItem", this.#updateItem);
        delete game.fade.combatForm;
        return super.close(options);
    }
    /**
     * Hook event handler for updateActor.
     * @protected
     * @param {any} actor
     * @param {any} updateData
     * @param {any} options
     * @param {any} userId
     */
    _updateTrackedActor = (actor, updateData, options, userId) => {
        // Check if the updated actor is in the tracked actors list by ID
        if (game.combat && this.trackedTokenIds.includes(actor.currentActiveToken?.id)) {
            // Find the row matching the actor ID
            const rowElement = document.querySelector(`tr[data-actor-id="${actor.id}"]`);
            const combat = updateData.system?.combat;
            if (rowElement) {
                // Dead or alive styling.
                if (updateData.system?.hp?.value !== undefined) {
                    $(rowElement).toggleClass(updateData.system?.hp.value <= 0 ? 'is-dead' : 'alive', true);
                    $(rowElement).toggleClass(updateData.system?.hp.value <= 0 ? 'alive' : 'is-dead', false);
                }
                if (combat?.declaredAction !== undefined) {
                    // Update select control value
                    const declaredActionEl = (rowElement.querySelector('[name="declaredAction"]'));
                    if (declaredActionEl)
                        declaredActionEl.value = combat.declaredAction;
                    // Update the declared action description
                    const localizedDescription = game.i18n.localize(`FADE.combat.maneuvers.${combat.declaredAction}.description`);
                    rowElement.querySelector('[name="actionDesc"]').textContent = localizedDescription;
                }
                if (combat?.attAgainstH !== undefined) {
                    rowElement.querySelector('[name="atnorecvh"]').textContent = combat.attAgainstH;
                }
                if (combat?.attAgainstM !== undefined) {
                    rowElement.querySelector('[name="atnorecvm"]').textContent = combat.attAgainstM;
                }
                if (combat?.attacks !== undefined) {
                    rowElement.querySelector('[name="atno"]').textContent = combat.attacks;
                }
            }
        }
    };
    /**
     * Event handler for when the player changes one of their character's declared action.
     * private
     * @param {any} event
     */
    async #onPlayerChangedAction(event) {
        //console.debug(event);
        const tokenId = event.currentTarget.dataset.tokenId;
        const actor = game.combat.combatants.find(combatant => combatant.token.id === tokenId)?.actor;
        const updateData = { "system.combat.declaredAction": event.currentTarget.value };
        await actor.update(updateData);
    }
    /**
    * This method is called upon form submission after form data is validated
    * @param {Event} event - The initial triggering submission event
    * @param {object} formData - The object of validated form data with which to update the object
    */
    async _updateObject(event, formData) {
        event.preventDefault();
    }
    static toggleCombatForm() {
        const declaredActions = game.settings.get(game.system.id, "declaredActions");
        if (!game.combat) {
            ui.notifications.warn(game.i18n.localize('FADE.apps.playerCombat.noCombat'));
        }
        else if (declaredActions === false) {
            ui.notifications.warn(game.i18n.localize('FADE.apps.playerCombat.noDeclaredActions'));
        }
        else {
            if (game.fade.combatForm) {
                game.fade.combatForm.close();
            }
            else {
                game.fade.combatForm = new PlayerCombatForm();
                game.fade.combatForm.render(true);
            }
        }
    }
    #updateCombatant = (combatant, updateData, options, userId) => {
        if (game.combat && this.trackedTokenIds.includes(combatant.token?.id)) {
            this.#updateCombatantData(combatant, updateData);
        }
    };
    #updateItem = (item, updateData, options, userId) => {
        const token = item?.parent?.currentActiveToken; // The actor the item belongs to
        if (game.combat && token && this.trackedTokenIds.includes(token.id)) {
            this.render(); // Re-render to reflect updated actor data
        }
    };
    #updateCombatantData(combatant, updateData) {
        // Find the row matching the actor ID
        const rowElement = document.querySelector(`tr[data-token-id="${combatant.token?.id}"]`);
        if (rowElement) {
            // If initiative changed and this isn't the GM
            if (updateData.initiative !== undefined && game.user.isGM === false) {
                const selectElement = rowElement.querySelector('[name="declaredAction"]');
                if (updateData.initiative !== null) {
                    selectElement.setAttribute("disabled", "disabled"); // Add disabled
                }
                else {
                    selectElement.removeAttribute("disabled"); // Remove disabled
                }
            }
        }
    }
}
