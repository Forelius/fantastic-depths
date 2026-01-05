import { AttackRollService, AttackRollResult } from './AttackRollService.js';
import { DamageRollResult, createDamageRollResult, FDItem } from './FDItem.js';
import { DialogFactory } from '../dialog/DialogFactory.js';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.js';
import { TagManager } from '../sys/TagManager.js';
import { ClassSystemBase } from '../sys/registry/ClassSystem.js';

export class SpellItem extends FDItem {
   attackRollService: AttackRollService;
   tagManager: TagManager;

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
      this.attackRollService = new AttackRollService();
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

   getDamageRoll(resp, targetToken): DamageRollResult {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = this.getEvaluatedRollSync(isHeal ? this.system.healFormula : this.system.dmgFormula);
      const digest = [];
      let damageFormula: string = evaluatedRoll?.formula;
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

      return hasDamage ? createDamageRollResult({
         damageFormula,
         targetuuid: targetToken?.uuid,
         damageType: isHeal ? "heal" : "magic",
         digest
      }) : null;
   }

   /**
   * Handle clickable rolls.
   */
   async roll(dataset) {
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
         });

         if (dialogResp?.resp?.result === false) {
            super.roll(dataset);
         } else if (dialogResp?.resp?.result === true) {
            await this.doSpellcast(dataset);
         }
      }
   }

   /**
    * Pass-thru to attack roll service.
    * @param dataset
    * @returns
    */
   async rollAttack(dataset: PropertyBag = null): Promise<AttackRollResult> {
      return await this.attackRollService.rollAttack(this, dataset);
   }

   async doSpellcast(dataset: PropertyBag = null): Promise<void> {
      const { instigator } = await this.getInstigator(dataset);
      const actionItem = dataset?.actionuuid ? foundry.utils.deepClone(await fromUuid(dataset.actionuuid)) : null;

      // If the item is not owned by an actor then assume it is owned by another item.
      // If owned by another item then this step would not be reached if there were zero charges remaining.
      if (await this._tryCastThenChargeThenUse(true, actionItem, dataset?.action)) {
         // Determine if spell requires an attack roll, such as touch spells.
         let rollAttackResult = null;

         // If the spell requires a successful melee attack...
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
            for (const condition of conditions) {
               condition.duration = durationResult.durationSec;
            }
            const chatOptions = {
               conditions,
               durationMsg: null
            };
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
      const item = actionItem || this;

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
      const item = actionItem || this;

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
         if (result === false) {
            const message = game.i18n.format('FADE.notification.noCharges', { itemName: item.knownName });
            ui.notifications.warn(message);
            ChatMessage.create({ content: message, speaker: { alias: item.actor?.name, } });
         }
      }

      return result;
   }

   async _tryCastMemorized(getOnly = false, actionItem) {
      const item = actionItem || this;
      const result = item.hasCast;

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
      const result = {
         text: `${game.i18n.format('FADE.Spell.duration')}: ${this.system.duration}`,
         durationSec: null,
      };
      if (this.system.durationFormula !== '-' && this.system.durationFormula !== null) {
         const rollData = this.getRollData();
         // If a castAs override is specified, like from a magic item with spellcasting abilities...
         if (dataset?.castas) {
            const classSystem: ClassSystemBase = game.fade.registry.getSystem("classSystem");
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