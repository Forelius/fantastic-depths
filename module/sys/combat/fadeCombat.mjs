// fadeCombat.mjs
import { SocketManager } from "../SocketManager.mjs"

// Custom Combat class
export class fadeCombat extends Combat {
    /**
     * Initialize FADE combat hooks.
     * Registers combat-related hooks for tracker and combatant lifecycle.
     * @static
     */
    static initialize() {
        /** ------------------------------- */
        /** Register combat-related hooks   */
        /** ------------------------------- */
        Hooks.on("renderCombatTracker", async (app, html, data) => data?.combat?.onRenderCombatTracker(app, html, data));
        Hooks.on("createCombat", (combat) => combat.onCreateCombat(combat));
        Hooks.on("deleteCombat", (combat) => combat.onDeleteCombat(combat));
        Hooks.on("createCombatant", async (combatant, options, userId) => await options.parent.onCreateCombatant(combatant, options, userId));
        Hooks.on("deleteCombatant", async (combatant, options, userId) => await options.parent.onDeleteCombatant(combatant, options, userId));
    }

    /**
     * @public
     * Get combatants owned by the current user.
     * @returns {Combatant[]} Array of owned combatants
     */
    get ownedCombatants() {
        return this.combatants.filter(combatant => combatant.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    }

    /**@override */
    prepareBaseData() {
        super.prepareBaseData();
        this.nextRoundMode = game.settings.get(game.system.id, "nextRound");
        this.declaredActions = game.settings.get(game.system.id, "declaredActions");
        this.initiativeSystem = game.fade.registry.getSystem("initiativeSystem");
    }

    /**
    * @override
    * @returns Combatant[]
    */
    setupTurns() {
        const result = this.initiativeSystem.setupTurns(this);
        return result;
    }

    /**
     * @override
     * Roll initiative for specified combatants.
     * @param {string[]} ids Combatant IDs to roll
     * @param {object} [options] Rolling options
     * @returns {Promise<Combat>}
     */
    async rollInitiative(ids, options) {
        const result = await this.initiativeSystem.rollInitiative(this, ids, options);
        console.debug("afterRollInitiative");
        Hooks.callAll("afterRollInitiative", this, result);
        return result;
    }

    /** 
     * @override 
     * Begin the combat encounter, advancing to round 1 and turn 1
     * @returns {Promise<Combat>}
     **/
    async startCombat() {
        let result = super.startCombat();
        const speaker = { alias: game.user.name };  // Use the player's name as the speaker
        if (game.user.isGM) {
            this.#resetCombatants();
            // Send a chat message when combat officially begins (round 1)
            ChatMessage.create({
                speaker: speaker,
                content: game.i18n.localize(`FADE.Chat.combatTracker.begin`),
            });
        }
        return result;
    }

    /** 
     * @override 
     * Advance the combat to the next round
     * @returns {Promise<Combat>}
     * */
    async nextRound() {
        let nextRound = this.round + 1;
        let result = super.nextRound();
        const speaker = { alias: game.user.name };  // Use the player's name as the speaker

        if (game.user.isGM) {
            this.#resetCombatants();

            // If initiative next round mode is reset...
            if (this.nextRoundMode === "reset") {
                // Reset initiative for all combatants
                for (let combatant of this.combatants) {
                    // Reset initiative to null
                    await combatant.update({ initiative: null });
                }

                // Optionally send a chat message to notify players
                ChatMessage.create({
                    speaker: speaker,
                    content: game.i18n.format(`FADE.Chat.combatTracker.initReset`, { round: nextRound }),
                });
            }
            else if (this.nextRoundMode === "reroll") {
                // Reroll initiative
                this.rollInitiative([]);

                // Optionally send a chat message to notify players
                ChatMessage.create({
                    speaker: speaker,
                    content: game.i18n.format(`FADE.Chat.combatTracker.initRerolled`, { round: nextRound }),
                });
            }
            else {
                // Optionally send a chat message to notify players
                ChatMessage.create({
                    speaker: speaker,
                    content: game.i18n.format(`FADE.Chat.combatTracker.initHeld`, { round: nextRound }),
                });
            }
        }

        return result;
    }

    /**
     * Reset all combatant initiative scores, setting the turn back to zero
     * @returns {Promise<Combat>}
     */
    async resetAll() {
        await super.resetAll();
        //for (let c of this.combatants) {
        //    c.updateSource({ initiative: null, "flags.ctIndices": [] });
        //}
        //return this.update({ turn: this.started ? 0 : null, combatants: this.combatants.toObject() }, { diff: false });
    }

    /**
     * @override
     * Activate a combatant by turn index.
     * @param {number} turn Turn index to activate
     */
    async _activateCombatant(turn) {
        if (game.user.isGM) {
            await game.combat.update({ turn });
        }
    }

    /**
     * Add custom elements to the combat tracker UI.
     * @param {any} app
     * @param {any} html
     * @param {any} data
     */
    async onRenderCombatTracker(app, html, data) {
        if (html instanceof Element === false) {
            html = html[0];
        }
        if (data?.combat?.combatants) {
            this.initiativeSystem.renderCombatTracker(html, data);
        }
    }

    /**
     * @public
     * Handle combat creation; announce in chat.
     * @param {Combat} combat Combat instance
     */
    onCreateCombat(combat) {
        if (game.user.isGM) {
            const speaker = { alias: game.user.name };  // Use the player's name as the speaker
            // Send a chat message when combat begins
            ChatMessage.create({
                speaker: speaker,
                content: game.i18n.localize("FADE.Chat.combatTracker.created"),
            });
        }
    }

    /**
     * @public
     * Handle combat deletion; clean up forms and reset combatants.
     * @param {Combat} combat Combat instance
     */
    onDeleteCombat(combat) {
        if (game.user.isGM) {
            combat.tryClosePlayerCombatForm();
            const speaker = { alias: game.user.name };  // Use the player's name as the speaker
            // Send a chat message when combat ends
            ChatMessage.create({
                speaker: speaker,
                content: game.i18n.localize("FADE.Chat.combatTracker.ended"),
            });
            for (let combatant of combat.combatants) {
                combatant.roundReset(true);
            }
        }
    }

    /**
     * @public
     * Handle combatant creation; initialize declared action.
     * @param {Combatant} combatant The created combatant
     * @param {object} options Hook options
     * @param {string} userId User ID who triggered creation
     */
    async onCreateCombatant(combatant, options, userId) {
        if (game.user.isGM) {
            if (combatant.actor === null || combatant.actor === undefined) {
                console.warn(`World actor no longer exists for combatant ${combatant.name}. Skipping combatant.`);
            } else {
                await combatant.actor.update({ "system.combat.declaredAction": "nothing" });
            }
        }
    }

    /**
     * @public
     * Handle combatant deletion; close player form and clear action.
     * @param {Combatant} combatant The deleted combatant
     * @param {object} options Hook options
     * @param {string} userId User ID who triggered deletion
     */
    async onDeleteCombatant(combatant, options, userId) {
        if (game.user.isGM && combatant.actor) {
            this.tryClosePlayerCombatForm([userId]);
            await combatant.actor.update({ "system.combat.declaredAction": null });
            await combatant.roundReset();
        }
    }

    /**
     * @public
     * Update current/previous state tracking and set turns.
     * @param {Combatant[]} turns Ordered list of combat turns
     * @returns {Combatant[]} Updated turns
     */
    updateStateTracking(turns) {
        // Update state tracking
        let c = turns[this.turn];
        this.current = {
            round: this.round,
            turn: this.turn,
            combatantId: c ? c.id : null,
            tokenId: c ? c.tokenId : null
        };

        // One-time initialization of the previous state
        if (!this.previous) this.previous = this.current;
        return this.turns = turns;
    }

    /**
     * @public
     * Request player combat forms to close via sockets.
     * @param {string[]} [userIds=[]] Target user IDs to notify
     */
    tryClosePlayerCombatForm(userIds = []) {
        if (this.declaredActions === true) {
            if (userIds.length > 0) {
                SocketManager.sendToUsers(userIds, "closePlayerCombat", { combatid: this.id });
            } else {
                SocketManager.sendToAllUsers("closePlayerCombat", { combatid: this.id });
            }
        }
    }

    /**
     * @private
     * Request all users to show the player combat form.
     */
    #tryShowPlayerCombatForm() {
        if (this.declaredActions === true) {
            SocketManager.sendToAllUsers("showPlayerCombat", { combatid: this.id });
        }
    }

    /**
     * @private
     * Show player combat form and reset each combatant for new round.
     */
    #resetCombatants() {
        this.#tryShowPlayerCombatForm();
        for (let combatant of this.combatants) {
            combatant.roundReset();
        }
    }
}