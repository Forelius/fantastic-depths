import { DialogFactory } from '../dialog/DialogFactory';
import { FDItem } from './FDItem';
export class ConditionItem extends FDItem {
    get duration() {
        return 0;
    }
    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.id) {
            this.system.key = this.system.key === '' ? this.name.toLowerCase() : this.system.key;
            if (this.effects.size === 0) {
                this.createEmbeddedDocuments('ActiveEffect', [
                    {
                        name: this.name,
                        img: 'icons/svg/aura.svg',
                        //origin: this.owner.uuid,               
                        disabled: false
                    }
                ]);
            }
        }
    }
    async setEffectsDuration(durationSec) {
        for (let effect of this.effects) {
            await effect.update({ "duration.seconds": durationSec });
        }
    }
    static async clickApplyCondition(event) {
        const element = event.currentTarget;
        const dataset = element.dataset;
        if (dataset.name || dataset.uuid) {
            event.preventDefault(); // Prevent the default behavior
            event.stopPropagation(); // Stop other handlers from triggering the event
            let sourceCondition = foundry.utils.deepClone(await fromUuid(dataset.uuid));
            if (!sourceCondition) {
                sourceCondition = foundry.utils.deepClone(await game.fade.fadeFinder.getCondition(dataset.name));
            }
            if (sourceCondition) {
                // Get targets
                const selected = Array.from(canvas.tokens.controlled);
                const targeted = Array.from(game.user.targets);
                let applyTo = [];
                let hasTarget = targeted.length > 0;
                let hasSelected = selected.length > 0;
                let isCanceled = false;
                if (hasTarget && hasSelected) {
                    const dialogResp = await DialogFactory({
                        dialog: "yesno",
                        title: game.i18n.localize('FADE.dialog.applyToPrompt'),
                        content: game.i18n.localize('FADE.dialog.applyToPrompt'),
                        yesLabel: game.i18n.localize('FADE.dialog.targeted'),
                        noLabel: game.i18n.localize('FADE.dialog.selected'),
                        defaultChoice: "yes"
                    });
                    if (dialogResp?.resp?.result == undefined) {
                        isCanceled = true;
                    }
                    else if (dialogResp?.resp?.result === true) {
                        hasSelected = false;
                    }
                    else if (dialogResp?.resp?.result === false) {
                        hasTarget = false;
                    }
                }
                if (isCanceled === true) {
                    // do nothing.
                }
                else if (hasTarget) {
                    applyTo = targeted;
                }
                else if (hasSelected) {
                    applyTo = selected;
                }
                else {
                    ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
                }
                // Ensure we have a target ID
                if (applyTo.length > 0) {
                    const durationSec = Number.parseInt(dataset.duration);
                    let chatContent = game.i18n.format("FADE.Chat.appliedCondition", { condition: sourceCondition.name });
                    for (let target of applyTo) {
                        if (target.actor.isOwner === true) {
                            const conditions = (await target.actor.createEmbeddedDocuments("Item", [sourceCondition]));
                            if (Number.isNaN(durationSec) === false) {
                                for (let condition of conditions) {
                                    condition.setEffectsDuration(durationSec);
                                }
                            }
                            chatContent += `<div>${target.name}</div>`;
                        }
                    }
                    if (game.fade.toastManager) {
                        game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
                    }
                    const speaker = { alias: game.users.get(game.userId).name }; // Use the player's name as the speaker
                    ChatMessage.create({ speaker: speaker, content: chatContent });
                }
            }
        }
    }
    static async clickRemoveCondition(event) {
        const element = event.currentTarget;
        const dataset = element.dataset;
        if (dataset.name || dataset.uuid) {
            event.preventDefault(); // Prevent the default behavior
            event.stopPropagation(); // Stop other handlers from triggering the event
            let sourceCondition = foundry.utils.deepClone(await fromUuid(dataset.uuid));
            if (!sourceCondition) {
                sourceCondition = foundry.utils.deepClone(await game.fade.fadeFinder.getCondition(dataset.name));
            }
            if (sourceCondition) {
                const selected = Array.from(canvas.tokens.controlled);
                const targeted = Array.from(game.user.targets);
                let removeFrom = [];
                let hasTarget = targeted.length > 0;
                let hasSelected = selected.length > 0;
                let isCanceled = false;
                if (hasTarget && hasSelected) {
                    const dialogResp = await DialogFactory({
                        dialog: "yesno",
                        title: game.i18n.localize('FADE.dialog.removeFromPrompt'),
                        content: game.i18n.localize('FADE.dialog.removeFromPrompt'),
                        yesLabel: game.i18n.localize('FADE.dialog.targeted'),
                        noLabel: game.i18n.localize('FADE.dialog.selected'),
                        defaultChoice: "yes"
                    });
                    if (dialogResp?.resp?.result == undefined) {
                        isCanceled = true;
                    }
                    else if (dialogResp?.resp?.result === true) {
                        hasSelected = false;
                    }
                    else if (dialogResp?.resp?.result === false) {
                        hasTarget = false;
                    }
                }
                if (isCanceled === true) {
                    // do nothing.
                }
                else if (hasTarget) {
                    removeFrom = targeted;
                }
                else if (hasSelected) {
                    removeFrom = selected;
                }
                else {
                    ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
                }
                // Ensure we have a target ID
                if (removeFrom.length > 0) {
                    let chatContent = game.i18n.format("FADE.Chat.removedCondition", { condition: sourceCondition.name });
                    for (let target of removeFrom) {
                        if (target.actor.isOwner === true) {
                            const actorCondition = target.actor.items.find(i => i.type === "condition" && i.system.key === sourceCondition.system.key);
                            if (actorCondition) {
                                actorCondition.delete();
                                chatContent += `<div>${target.name}</div>`;
                            }
                        }
                    }
                    if (game.fade.toastManager) {
                        game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
                    }
                    const speaker = { alias: game.users.get(game.userId).name }; // Use the player's name as the speaker
                    ChatMessage.create({ speaker: speaker, content: chatContent });
                }
            }
        }
    }
}
