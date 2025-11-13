import { RollAttackMixin } from './mixins/RollAttackMixin.mjs';
import { FDItem } from './FDItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class SpellItem extends RollAttackMixin(FDItem) {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
      systemData.targetSelf = systemData.targetSelf === undefined ? true : systemData.targetSelf;
      systemData.targetOther = systemData.targetOther === undefined ? true : systemData.targetOther
      systemData.dmgFormula = systemData.dmgFormula || null;
      systemData.healFormula = systemData.healFormula || null;
      systemData.maxTargetFormula = systemData.maxTargetFormula || null;
      systemData.durationFormula = systemData.durationFormula || null;
      systemData.savingThrow = systemData.savingThrow || "";
      systemData.attackType = systemData.attackType || ""
      systemData.damageType = systemData.damageType || ""
   }

   getDamageRoll(resp, targetToken) {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = this.getEvaluatedRollSync(isHeal ? this.system.healFormula : this.system.dmgFormula);
      const digest = [];
      let damageFormula = evaluatedRoll?.formula;
      let modifier = 0;
      let hasDamage = true;

      if (resp?.mod && resp?.mod !== 0) {
         damageFormula = damageFormula ? `${damageFormula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      return hasDamage ? { 
         damageFormula, 
         targetUuid: targetToken?.uuid,
         damageType: isHeal ? "heal" : "magic", 
         digest 
      } : null;
   }

   /**
   * Handle clickable rolls.
   * @override
   * @private
   */
   async roll(dataset) {
      const owner = dataset?.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || this.actor?.currentActiveToken || canvas.tokens.controlled?.[0]?.document;
      if (!instigator) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenAssoc'));
         return null;
      }
      if (dataset?.skipdlg === true) {
         // I'm not sure this condition ever happens.
         super.roll(dataset);
      } else {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: game.i18n.localize('FADE.dialog.spellcast.title'),
            content: game.i18n.localize('FADE.dialog.spellcast.content'),
            noLabel: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
            yesLabel: game.i18n.localize('FADE.dialog.spellcast.yesLabel'),
            defaultChoice: "yes"
         }, instigator);

         if (dialogResp?.resp?.result === false) {
            super.roll(dataset, owner);
         } else if (dialogResp?.resp?.result === true) {
            await this.doSpellcast(dataset);
         }
      }
   }

   async doSpellcast(dataset = null) {
      const owner = dataset?.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || this.actor?.currentActiveToken || canvas.tokens.controlled?.[0]?.document;
      const actionItem = dataset?.actionuuid ? foundry.utils.deepClone(await fromUuid(dataset.actionuuid)) : null;

      // If the item is not owned by an actor then assume it is owned by another item.
      // If owned by another item then this step would not be reached if there were zero charges remaining.
      if (await this._tryCastThenChargeThenUse(true, actionItem, dataset?.action)) {

         // Determine if spell requires an attack roll, such as touch spells.
         let rollAttackResult = null;
         if (this.system.attackType === 'melee') {
            // Roll the attack.
            rollAttackResult = await this.rollAttack();
         }

         // Get the spell duration data.
         const durationResult = await this.#getDurationResult(dataset);

         // If there was no attack roll or the attack roll was not canceled...
         if (rollAttackResult === null || rollAttackResult?.canAttack === true) {
            // Use spell resource (charge, cast or use)
            await this._tryCastThenChargeThenUse(false, actionItem, dataset?.action);

            const chatData = {
               caller: this, // the spell
               context: instigator, // the caster
               roll: rollAttackResult?.rollEval,
               digest: rollAttackResult?.digest,
            };

            // Set condition durations.
            const conditions = foundry.utils.deepClone(this.system.conditions);
            for (let condition of conditions) {
               condition.duration = durationResult.durationSec;
            }
            const chatOptions = { conditions };
            if (actionItem == null) {
               // Only show duration if not being cast from an item.
               chatOptions.durationMsg = durationResult.text;
            }
            const builder = new ChatFactory(CHAT_TYPE.SPELL_CAST, chatData, chatOptions);
            await builder.createChatMessage();
         }
      }
   }

   /**
    * Retrieves an array of attack types. Attack types include breath, missile and melee.
    * @returns An array of valid attack types for this weapon.
    */
   getAttackTypes() {
      const result = [];
      result.push({ text: game.i18n.localize(`FADE.dialog.attackType.${this.system.attackType}`), value: this.system.attackType });
      return result;
   }

   /**
    * Some items may have charges and cast uses both. if the item has the cast property then
    * cast is used, otherwise charge is used.
    * @param {any} getOnly If true, does not use, just gets.
    * @param {any} actionItem The item that owns this item, or null.
    */
   async _tryCastThenCharge(getOnly = false, actionItem) {
      let result = false;
      let item = actionItem || this;

      if (item.system.cast !== undefined) {
         result = await this._tryCastMemorized(getOnly, actionItem);
      } else if (item.system.charges !== undefined) {
         result = await this._tryUseCharge(getOnly, actionItem);
      }

      return result;
   }

   /**
    * Some items may have uses, casts and charges. If the item has the cast property then cast is used.
    * If there are charges then a charge is used. If the result of both of those are false then use/qty is used.
    * @param {any} getOnly If true, does not use, just gets.
    * @param {any} actionItem The item that owns this item, or null.
    * @param {*} action The action property of the dataset (consume)
    */
   async _tryCastThenChargeThenUse(getOnly = false, actionItem, action) {
      let result = false;
      let item = actionItem || this;

      if (item.system.cast !== undefined) {
         result = await this._tryCastMemorized(getOnly, actionItem);
      } else {
         // If this item has charges property and the item does have a charge remaining...
         if (item.system.charges !== undefined && item.hasCharge) {
            result = await this._tryUseCharge(getOnly, actionItem);
         }
         if (action?.length > 0 && action !== "none" && result === false) {
            result = await this._tryUseUsage(getOnly, actionItem);
         }
      }

      return result;
   }

   async _tryCastMemorized(getOnly = false, actionItem) {
      let item = actionItem || this;
      let result = item.hasCast;

      if (getOnly !== true) {
         // Add 1 if not infinite and above max casts
         if (item.hasCast && item.system.Memorized !== null) {
            await item.update({ "system.cast": item.system.cast + 1 });
         }
      }
      // If there are no charges remaining, show a UI notification
      if (result === false) {
         const message = game.i18n.format('FADE.notification.notMemorized', { actorName: item.actor.name, spellName: this.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: item.actor.name, } });
      }

      return result;
   }

   async #getDurationResult(dataset) {
      let result = {
         text: `${game.i18n.format('FADE.Spell.duration')}: ${this.system.duration}`
      };
      if (this.system.durationFormula !== '-' && this.system.durationFormula !== null) {
         const rollData = this.getRollData();
         // If a castAs override is specified, like from a magic item with spellcasting abilities...
         if (dataset?.castas) {
            const classSystem = game.fade.registry.getSystem("classSystem");
            const parsed = classSystem.parseClassAs(dataset.castas);
            rollData.classes[parsed.classId] = { castLevel: parsed.classLevel };
         }
         const rollEval = await new Roll(this.system.durationFormula, rollData).evaluate();
         result.text = `${result.text} (${rollEval.total} ${game.i18n.localize('FADE.rounds')})`;
         const roundSeconds = game.settings.get(game.system.id, "roundDurationSec") ?? 10;
         result.durationSec = rollEval.total * roundSeconds;
      }
      return result;
   }
}