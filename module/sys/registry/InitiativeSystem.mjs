import { DialogFactory } from '../../dialog/DialogFactory.mjs';
import { SocketManager } from '../SocketManager.mjs'
import { CodeMigrate } from "/systems/fantastic-depths/module/sys/migration.mjs";

class BaseInitiative {
    async rollInitiative(combat, ids, options = {}) { throw new Error("Method not implemented."); }

    /**
     * @returns Combatant[]
     */
    setupTurns(combat) {
        const turns = combat.combatants.contents.filter((combatant) => combatant.actor && combatant.token);
        if (turns.length > 0) {
            turns.sort((a, b) => this.sortCombatant(a, b));
        }

        return combat.updateStateTracking(turns);
    }

    /**
     * Add custom elements to the combat tracker UI.
     * @param {any} html
     * @param {any} data
     */
    async renderCombatTracker(html, data) {
        // Iterate over each combatant and apply a CSS class based on disposition
        for (let combatant of data.combat.combatants) {
            /* console.debug(combatant);*/
            const disposition = combatant.token.disposition;
            const combatantElement = html.querySelector(`.combatant[data-combatant-id="${combatant.id}"]`);
            // Set disposition indicator
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
                combatantElement.classList.add("disposition-friendly");
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
                combatantElement.classList.add("disposition-neutral");
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
                combatantElement.classList.add("disposition-hostile");
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
                combatantElement.classList.add("disposition-secret");
            }
            if (data.combat.declaredActions === true) {
                await this.setupElem(combatantElement, combatant);
            }
        }
    }

    /**
     * Adds the combat manuever declaration control to the combat tracker.
     * @param {any} combat
     * @param {any} combatantElement
     * @param {any} combatant
     */
    async setupElem(combatantElement, combatant) {
        const combatantControls = combatantElement.querySelector(".combatant-controls");
        const templateData = {
            combatant,
            showMove: combatant.canMove,
            showAction: true
        };
        if (combatant.isSlowed) {
            const slowContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-slow.hbs", templateData);
            combatantControls.querySelector(".token-effects").insertAdjacentHTML("beforeend", slowContent);
        }

        const controlsContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-controls.hbs", templateData);
        combatantControls.insertAdjacentHTML("afterend", controlsContent);
    }
}

export class IndivInit extends BaseInitiative {
    constructor() {
        super();
        this.declaredActions = game.settings.get(game.system.id, "declaredActions");
        this.phaseOrder = Object.keys(CONFIG.FADE.CombatPhases.normal);
        this.initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
    }

    /**
    * Roll initiative for one or multiple Combatants within the Combat document
    * @override
    * @param {object} combat The combat instance
    * @param {string|string[]} ids A Combatant id or Array of ids for which to roll
    * @param {object} [options={}] Additional options which modify how initiative rolls are created or presented.
    * @param {string|null} [options.formula] A non-default initiative formula to roll. Otherwise, the system default is used.
    * @param {boolean} [options.updateTurn=true] Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
    * @param {object} [options.messageOptions={}] Additional options with which to customize created Chat Messages
    * @returns {Promise<Combat>} A promise which resolves to the updated Combat document once updates are complete.
    */
    async rollInitiative(combat, ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        const combatants = combat.combatants.filter((i) => ids.length === 0 || ids.includes(i.id));
        await this.#doInitiativeRoll(combat, combatants);  // Use the custom initiative function
        return this;
    }

    sortCombatant(a, b) {
        let result = 0;
        let aActor = a.actor;
        let bActor = b.actor;

        if (aActor && bActor) {
            // Use combat phases order
            if (this.initiativeMode === "individualChecklist" && this.declaredActions === true && result === 0 && a.initiative !== null && b.initiative !== null) {
                const aPhase = a.declaredActionPhase;
                const bPhase = b.declaredActionPhase;

                // Only compare if both combatants have a valid phase
                if (aPhase && bPhase && aPhase !== bPhase) {
                    const aPhaseIndex = this.phaseOrder.indexOf(aPhase);
                    const bPhaseIndex = this.phaseOrder.indexOf(bPhase);
                    result = aPhaseIndex - bPhaseIndex;
                }
            }

            if (result === 0 && this.initiativeMode !== "simpleIndividual") {
                const aWeapon = aActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
                const bWeapon = bActor.items?.find(item => item.type === 'weapon' && item.system.equipped);
                const aSlowEquipped = aWeapon?.system.isSlow === true;
                const bSlowEquipped = bWeapon?.system.isSlow === true;
                // Compare slowEquipped, true comes after false
                if (aSlowEquipped !== bSlowEquipped) {
                    result = aSlowEquipped ? 1 : -1;
                }
            }

            // Compare initiative, descending order
            if (result === 0 && a.initiative !== b.initiative) {
                result = b.initiative - a.initiative;
            }

            // Compare dexterity, descending order; treat null/undefined as last
            const aDex = aActor.system.abilities?.dex.total;
            const bDex = bActor.system.abilities?.dex.total;
            if (result === 0) {
                if (!aDex) {
                    if (bDex) {
                        result = 1;
                    }
                } else if (!bDex) {
                    result = -1;
                } else if (aDex !== bDex) {
                    result = bDex - aDex;
                }
            }
        }

        return result;
    }

    /**
     * The custom rollInitiative function
     * @param {any} combat
     */
    async #doInitiativeRoll(combat, combatants) {
        // Array to accumulate roll results for the digest message
        let rollResults = [];

        for (let combatant of combatants) {
            const updates = [];
            const rollData = combatant.actor.getRollData();
            const mod = this.#getInitiativeMod(combatant.actor); // Get the initiative modifier
            rollData.mod = mod;

            // Perform the roll using the initiative formula
            const roll = new Roll(this.initiativeFormula, rollData);
            const rolled = await roll.evaluate();

            // Update the combatant's initiative with the roll result
            updates.push({ _id: combatant.id, initiative: rolled.total });

            // Accumulate the roll result for the digest message, showing mod only if it's not 0
            const modText = mod !== 0 ? `(mod ${mod > 0 ? '+' : ''}${mod})` : '';
            rollResults.push({
                message: game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: combatant.name, roll: rolled.total, mod: modText }),
                updates
            });
        }

        // Create a single chat message for all rolls
        if (rollResults.length > 0) {
            const updates = rollResults.reduce((a, b) => [...a, ...b.updates], []);
            if (updates.length > 0) {
                // Update multiple combatants
                await combat.updateEmbeddedDocuments("Combatant", updates);
            }

            console.log("Initiative roll details:", rollResults);
            combat._activateCombatant(0);
        }
    }

    #getInitiativeMod(actor) {
        let result = 0;
        result += actor.system?.mod.initiative || 0;
        if (actor.type !== 'monster') {
            result += actor.system?.abilities?.dex?.mod || 0;
        }
        return result;
    }
}

export class GroupInit extends BaseInitiative {
    constructor() {
        super();
        this.declaredActions = game.settings.get(game.system.id, "declaredActions");
        this.phaseOrder = Object.keys(CONFIG.FADE.CombatPhases.normal);
        this.initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
    }

    /**
    * Roll initiative for one or multiple Combatants within the Combat document
    * @override
    * @param {string|string[]} ids     A Combatant id or Array of ids for which to roll
    * @param {object} [options={}]     Additional options which modify how initiative rolls are created or presented.
    * @param {string|null} [options.formula]         A non-default initiative formula to roll. Otherwise, the system
    *                                                default is used.
    * @param {boolean} [options.updateTurn=true]     Update the Combat turn after adding new initiative scores to
    *                                                keep the turn on the same Combatant.
    * @param {object} [options.messageOptions={}]    Additional options with which to customize created Chat Messages
    * @returns {Promise<Combat>}       A promise which resolves to the updated Combat document once updates are complete.
     */
    async rollInitiative(combat, ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        // Get all combatants and group them by disposition
        let groups = messageOptions?.group ? [messageOptions?.group] : [];
        if (groups.length === 0 && ids.length > 0) {
            const rollingCombatants = combat.combatants.filter(combatant => ids?.includes(combatant.id));
            groups = [...new Set(rollingCombatants.map(combatant => combatant.getGroup()))];
        }
        if (game.user.isGM === true) {
            for (const group of groups) {
                await this.doInitiativeRoll(combat, combat.combatants, group);  // Use the custom initiative function
            }
        } else {
            let bRolling = true;
            // If friendly rolling, declared actions enabled...
            if (groups.includes('friendly') && this.declaredActions === true) {
                // combatant declared action is 'nothing'...
                const friendly = this.getCombatantsForDisposition(combat, CONST.TOKEN_DISPOSITIONS.FRIENDLY);
                if (this.hasDeclaredAction(friendly, 'nothing') === true) {
                    bRolling = await this.promptUserRoll();
                }
            }
            if (bRolling === true) {
                SocketManager.sendToGM("rollGroupInitiative", { combatid: combat.id });
            }
        }

        return this;
    }

    /**
     * Sort two combatants
     * @param {any} a Combatant 1, or a
     * @param {any} b Combatant 2, or b
     * @returns A negative value indicates a comes before b, a positive value indicates a comes after b 
     * and zero or NaN indicates that a and b are equal.
     */
    sortCombatant(a, b) {
        let result = 0;
        const aActor = a.actor;
        const bActor = b.actor;
        const aGroup = a.token.disposition;
        const bGroup = b.token.disposition;

        // If both combatants are not using slow weapons...
        if (a.isSlowed !== b.isSlowed) {
            result = a.isSlowed ? 1 : -1;
        }

        // Use combat phases order
        if (this.declaredActions === true && result === 0 && aGroup === bGroup && a.initiative !== null && b.initiative !== null) {
            const aPhase = a.declaredActionPhase;
            const bPhase = b.declaredActionPhase;

            // Only compare if both combatants have a valid phase
            if (aPhase && bPhase && aPhase !== bPhase) {
                const aPhaseIndex = this.phaseOrder.indexOf(aPhase);
                const bPhaseIndex = this.phaseOrder.indexOf(bPhase);
                result = aPhaseIndex - bPhaseIndex;
            }
        }

        // Compare initiative, descending order
        if (result === 0 && a.initiative !== b.initiative) {
            result = b.initiative - a.initiative;
        }

        // Compare dexterity, descending order; treat null/undefined as last
        const aDex = aActor.system.abilities?.dex.total ?? 0;
        const bDex = bActor.system.abilities?.dex.total ?? 0;
        if (result === 0) {
            result = bDex - aDex;
        }

        return result;
    }

    /**
     * The custom rollInitiative function
     * @param {any} combat
     */
    async doInitiativeRoll(combat, combatants, group = null) {
        // Array to accumulate roll results for the digest message
        let rollResults = [];

        // Get all combatants and group them by disposition         
        this.groups = this.groupCombatants(combatants);

        // Friendly group (uses modifiers)
        if ((group === null || group === 'friendly') && this.groups.friendly.length > 0) {
            const rollResult = await this.rollForGroup(this.groups.friendly, "Friendlies");
            if (rollResult) rollResults.push(rollResult);
        }

        // Neutral group (uses modifiers)
        if ((group === null || group === 'neutral') && this.groups.neutral.length > 0) {
            const rollResult = await this.rollForGroup(this.groups.neutral, "Neutrals");
            if (rollResult) rollResults.push(rollResult);
        }

        // Hostile group (monsters may not use modifiers)
        if ((group === null || group === 'hostile') && this.groups.hostile.length > 0) {
            const rollResult = await this.rollForGroup(this.groups.hostile, "Hostiles");
            if (rollResult) rollResults.push(rollResult);
        }

        // Create a single chat message for all rolls
        if (rollResults.length > 0) {
            const updates = rollResults.reduce((a, b) => [...a, ...b.updates], []);
            if (updates.length > 0) {
                // Update multiple combatants
                await combat.updateEmbeddedDocuments("Combatant", updates);
            }

            console.log("Initiative roll details:", rollResults);
            combat._activateCombatant(0);
        }
    }

    /**
     * Determines if any of the specified combatants have their declared action set to 'nothing'
     * @param {any} combatants an array of combatants.
     * @param {*} action A string representing a combat maneuver, aka declared action.
     * @returns true if nothing is declared, otherwise false.
     */
    hasDeclaredAction(combatants, action) {
        return combatants.filter(combatant => combatant.actor.system.combat.declaredAction === action)?.length > 0;
    }

    /**
     * Creates groups based on token disposition.
     * @param {any} combatants
     * @returns
     */
    groupCombatants(combatants) {
        const groups = {
            friendly: [],
            neutral: [],
            hostile: [],
            secret: [],
        };

        // Iterate over combatants and group them by their token disposition
        for (let combatant of combatants) {
            const disposition = combatant.token.disposition;
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
                groups.friendly.push(combatant);
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
                groups.neutral.push(combatant);
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
                groups.hostile.push(combatant);
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
                groups.secret.push(combatant);
            }
        }

        return groups;
    }

    // method to handle group-based initiative
    async rollForGroup(group, groupName) {
        let rollData = {};
        let result = null;
        let usedMod = 0; // Track the modifier used for this group
        const updates = [];

        rollData = { mod: 0 };
        usedMod = 0;

        // Perform the roll using the initiative formula
        const roll = new Roll(this.initiativeFormula, rollData);
        const rolled = await roll.evaluate();

        // Apply the same initiative result to all combatants in the group
        for (const combatant of group) {
            updates.push({ _id: combatant.id, initiative: rolled.total });
        }

        // Return the roll result for the digest message, including the used modifier
        if (group.length > 0) {
            const modText = usedMod !== 0 ? `(${usedMod > 0 ? '+' : ''}${usedMod})` : '';
            result = {
                message: game.i18n.format(`FADE.Chat.combatTracker.initRoll`, { name: groupName, roll: rolled.total, mod: modText }),
                updates
            }
        }

        return result;
    }

    getCombatantsForDisposition(combat, disposition) {
        return combat.combatants.filter(combatant => combatant.token.disposition === disposition);
    }

    async promptUserRoll() {
        let result = false;
        const dialogResp = await DialogFactory({
            dialog: "yesno",
            content: game.i18n.localize('FADE.dialog.confirmInitiativeRoll'),
        });
        if (dialogResp?.resp?.rolling === true && dialogResp?.resp?.result === true) {
            result = true;
        }
        return result;
    }
}

export class AltGroupInit extends GroupInit {
    constructor() {
        super();
        this.phaseOrders = CONFIG.FADE.CombatPhases.immortal;
        this.phaseIndex = 0;
    }

    /**
     * @override
     * @returns Combatant[]
     */
    setupTurns(combat) {
        this.phaseIndex = 0;
        const swiftTurns = combat.combatants.contents.filter((combatant) => combatant.actor && combatant.token
            && (combatant.canMove || combatant.isSwifterAction || combatant.initiative == null));

        if (swiftTurns.length > 0) {
            this.phaseOrder = Object.keys(this.phaseOrders.swifter);
            swiftTurns.sort((a, b) => this.sortCombatant(a, b));
            swiftTurns.forEach(i => i.isSwifterPhase = i.initiative != null);
        }
        //swiftTurns.forEach((c, i) => { if (c.flags.ctIndices !== undefined && !c.flags.ctIndices[0]) c.flags.ctIndices[0] = i });

        this.phaseIndex = 1;
        const turns = combat.combatants.contents.filter((combatant) => combatant.initiative && combatant.actor && combatant.token && !combatant.isSwifterAction);
        if (turns.length > 0) {
            this.phaseOrder = Object.keys(this.phaseOrders.slower);
            turns.sort((a, b) => this.sortCombatant(a, b));
        }
        //turns.forEach((c, i) => { if (c.flags.ctIndices !== undefined && !c.flags.ctIndices[1]) c.flags.ctIndices[1] = i + swiftTurns.length });

        return combat.updateStateTracking([...swiftTurns, ...turns]);
    }

    /**
     * Sort two combatants for the non-swift actions phase
     * @param {any} a Combatant 1, or a
     * @param {any} b Combatant 2, or b
     * @returns A negative value indicates a comes before b, a positive value indicates a comes after b 
     * and zero or NaN indicates that a and b are equal.
     */
    sortCombatant(a, b) {
        let result = 0;
        const aActor = a.actor;
        const bActor = b.actor;
        const aPhase = a.declaredActionPhase;
        const bPhase = b.declaredActionPhase;

        //if (a.flags.ctIndices?.[this.phaseIndex] != null && b.flags.ctIndices?.[this.phaseIndex] != null
        //    && a.flags.ctIndices[this.phaseIndex] !== b.flags.ctIndices[this.phaseIndex]) {
        //    result = a.flags.ctIndices[this.phaseIndex] - b.flags.ctIndices[this.phaseIndex];
        //    console.debug(`${a.token.name}: ${a.flags.ctIndices[this.phaseIndex]}`);
        //}

        // Use combat phases order
        if (a.initiative !== null && b.initiative !== null) {
            // Only compare if both combatants have a valid phase
            if (aPhase && bPhase && aPhase !== bPhase) {
                const aPhaseIndex = this.phaseOrder.indexOf(aPhase);
                const bPhaseIndex = this.phaseOrder.indexOf(bPhase);
                result = aPhaseIndex - bPhaseIndex;
            }

            // If either, but not both, combatants are not using slow weapons and in the same phase...
            if (result === 0 && a.isSlowed !== b.isSlowed && aPhase === bPhase) {
                result = a.isSlowed ? 1 : -1;
            }
        }

        // Compare initiative, descending order
        if (result === 0 && a.initiative !== b.initiative) {
            result = b.initiative - a.initiative;
        }

        // Compare dexterity, descending order; treat null/undefined as last
        const aDex = aActor.system.abilities?.dex.total ?? 0;
        const bDex = bActor.system.abilities?.dex.total ?? 0;
        if (result === 0) {
            result = bDex - aDex;
        }

        return result;
    }

    /**
     * @override
     * Add custom elements to the combat tracker UI.
     * @param {any} html
     * @param {any} data
     */
    async renderCombatTracker(html, data) {
        // Iterate over each combatant and apply a CSS class based on disposition
        const swifter = {};
        for (let combatant of data.combat.turns) {
            let isSwifterPhase = false;
            if ((combatant.canMove || combatant.isSwifterAction) && swifter[combatant.id] === undefined) {
                swifter[combatant.id] = true;
                isSwifterPhase = true;
            }

            const disposition = combatant.token.disposition;
            const combatantElems = document.querySelectorAll(`.combatant[data-combatant-id="${combatant.id}"]`);

            // Set disposition indicator
            if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
                combatantElems.forEach(el => el.classList.add("disposition-friendly"));
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
                combatantElems.forEach(el => el.classList.add("disposition-neutral"));
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
                combatantElems.forEach(el => el.classList.add("disposition-hostile"));
            } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
                combatantElems.forEach(el => el.classList.add("disposition-secret"));
            }

            if (isSwifterPhase === true) {
                const swifterElem = combatantElems[0];
                await this.setupSwifterElem(swifterElem, combatant);
            } else {
                const slowerElem = (!combatant.isSwifterAction && combatant.canMove) ? combatantElems[1] : combatantElems[0];
                await this.setupSlowerElem(slowerElem, combatant);
            }
        }
    }

    /**
     * Adds the combat manuever declaration control to the combat tracker.
     * @param {any} combat
     * @param {any} combatantElement
     * @param {any} combatant
     */
    async setupSwifterElem(combatantElement, combatant) {
        const combatantControls = combatantElement.querySelector(".combatant-controls");
        const templateData = {
            combatant,
            isSwifter: true,
            showMove: combatant.canMove,
            showAction: combatant.isSwifterAction
        };
        if (combatant.isSlowed) {
            const slowContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-slow.hbs", templateData);
            combatantControls.querySelector(".token-effects").insertAdjacentHTML("beforeend", slowContent);
        }
        const controlsContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-controls.hbs", templateData);
        combatantControls.insertAdjacentHTML("afterend", controlsContent);
    }

    /**
     * Adds the combat manuever declaration control to the combat tracker.
     * @param {any} combat
     * @param {any} combatantElement
     * @param {any} combatant
     */
    async setupSlowerElem(combatantElement, combatant) {
        const combatantControls = combatantElement.querySelector(".combatant-controls");
        const templateData = {
            combatant,
            isSlower: true,
            showAction: !combatant.isSwifterAction
        };
        if (combatant.isSlowed) {
            const slowContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-slow.hbs", templateData);
            combatantControls.querySelector(".token-effects").insertAdjacentHTML("beforeend", slowContent);
        }
        const controlsContent = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/sidebar/combatant-controls.hbs", templateData);
        combatantControls.insertAdjacentHTML("afterend", controlsContent);
    }
}