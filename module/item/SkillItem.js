import { FDItem } from './FDItem.js';
import { DialogFactory } from '../dialog/DialogFactory.js';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.js';
export class SkillItem extends FDItem {
    get hasTargets() {
        return true;
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        const systemData = this.system;
        systemData.ability = systemData.ability !== undefined ? systemData.ability : "str";
        systemData.level = systemData.level !== undefined ? systemData.level : 1;
        systemData.rollMode = systemData.rollMode !== undefined ? systemData.rollMode : "publicroll";
        systemData.healFormula = systemData.healFormula || null;
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        const systemData = this.system;
        if (this.actor) {
            systemData.rollTarget = this.actor.system.abilities[systemData.ability].total;
        }
    }
    getDamageRoll() {
        const isHeal = this.system.healFormula?.length > 0;
        let damageFormula = null;
        let modifier = 0;
        let hasDamage = true; // Has heals or damage
        if (isHeal) {
            damageFormula = this.getEvaluatedRollSync(this.system.healFormula)?.formula;
        }
        if (modifier <= 0 && (damageFormula == null || damageFormula?.total <= 0)) {
            hasDamage = false;
        }
        return hasDamage ? { damageFormula, damageType: isHeal ? "heal" : null, digest: [], hasDamage: isHeal === true } : null;
    }
    /**
    * Handle clickable rolls.
    * @override
    * @param {any} event The originating click event
    */
    async roll(dataset, dialogResp = null, event = null) {
        const { instigator } = await this.getInstigator(dataset);
        const systemData = this.system;
        const digest = [];
        dataset = {
            rollType: 'item',
            label: this.name,
            dialog: 'generic',
            test: 'skill'
        };
        // Retrieve roll data.
        const rollData = this.getRollData();
        const ctrlKey = event?.ctrlKey ?? false;
        let levelMod = 0;
        let manualMod = 0;
        if (systemData.level <= 0) {
            levelMod = systemData.skillPenalty;
            digest.push(game.i18n.format("FADE.Chat.rollMods.unskilledUse", { mod: levelMod }));
        }
        else {
            levelMod = Math.max(0, systemData.level - 1) + systemData.skillBonus;
            if (systemData.operator === 'lte' || systemData.operator === "lt") {
                levelMod = -levelMod;
            }
            digest.push(game.i18n.format("FADE.Chat.rollMods.skilledUse", { mod: levelMod }));
        }
        let rolling = true;
        if (ctrlKey === true) {
            dialogResp = {
                mod: 0,
                formula: dataset.formula,
                editFormula: game.user.isGM
            };
            rollData.formula = dataset.formula;
        }
        else {
            // Show the dialog for roll modifier
            dataset.formula = systemData.rollFormula;
            dialogResp = await DialogFactory(dataset, this.actor);
            manualMod = Number(dialogResp?.mod) || 0;
            rolling = dialogResp != null;
            if (manualMod != 0) {
                digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: manualMod }));
            }
        }
        let result = null;
        if (rolling === true) {
            let mod = manualMod + levelMod;
            rollData.formula = mod != 0 ? `${systemData.rollFormula}+@mod` : `${systemData.rollFormula}`;
            // Roll
            const rollContext = { ...rollData, ...dialogResp || {} };
            const targetRoll = await new Roll(systemData.targetFormula, rollContext).evaluate();
            rollContext.mod = mod;
            let rolled = await new Roll(rollData.formula, rollContext).evaluate();
            // Show the chat message
            dataset.pass = systemData.operator; // this is a less than or equal to roll
            dataset.target = targetRoll.total; // systemData.rollTarget;
            dataset.rollmode = systemData.rollMode;
            dataset.autofail = systemData.autoFail;
            dataset.autosuccess = systemData.autoSuccess;
            const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${systemData.ability}.long`);
            dataset.desc = `${localizeAbility} (${CONFIG.FADE.Operators[systemData.operator]}${dataset.target})`;
            const chatData = {
                caller: this, // the skill item
                context: instigator, // the skill item owner (actor or token)
                mdata: dataset,
                roll: rolled,
                digest
            };
            const showResult = this._getShowResult(event);
            const builder = new ChatFactory(CHAT_TYPE.SKILL_ROLL, chatData, { showResult });
            result = builder.createChatMessage();
        }
        return result;
    }
}
