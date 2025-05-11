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

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
      systemData.targetSelf = systemData.targetSelf === undefined ? true : systemData.targetSelf;
      systemData.targetOther = systemData.targetOther === undefined ? true : systemData.targetOther
      systemData.dmgFormula = systemData.dmgFormula || null;
      systemData.healFormula = systemData.healFormula || null;
      systemData.maxTargetFormula = systemData.maxTargetFormula || 1;
      systemData.durationFormula = systemData.durationFormula || null;
      systemData.savingThrow = systemData.savingThrow || "";
      systemData.attackType = systemData.attackType || ""
      systemData.damageType = systemData.damageType || ""
   }

   getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = this.getEvaluatedRollSync(isHeal ? this.system.healFormula : this.system.dmgFormula);
      const digest = [];
      let formula = evaluatedRoll?.formula;
      let modifier = 0;
      let hasDamage = true;

      if (resp?.mod && resp?.mod !== 0) {
         formula = formula ? `${formula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      return {
         formula,
         type: isHeal ? "heal" : "magic",
         digest,
         hasDamage
      };
   }

   /**
   * Handle clickable rolls.
   * @override
   * @private
   */
   async roll(dataset) {
      const caster = this.actor || canvas.tokens.controlled?.[0];
      if (dataset?.skipdlg === true) {
         super.roll(dataset);
      } else if (caster) {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: game.i18n.localize('FADE.dialog.spellcast.title'),
            content: game.i18n.localize('FADE.dialog.spellcast.content'),
            noLabel: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
            yesLabel: game.i18n.localize('FADE.dialog.spellcast.yesLabel'),
            defaultChoice: "yes"
         }, this.actor);

         if (dialogResp?.resp?.result === false) {
            super.roll(dataset);
         } else if (dialogResp?.resp?.result === true) {
            await this.doSpellcast();
         }
      } else {
         ui.notifications.warn(game.i18n.localize('FADE.notification.spellSelectToken'));
      }

      return null;
   }

   async doSpellcast() {
      const instigator = this.actor?.token || this.actor || canvas.tokens.controlled?.[0];
      const systemData = this.system;
      let result = null;

      if (systemData.cast < systemData.memorized || systemData.memorized === null) {
         let rollAttackResult = null;

         if (this.system.attackType === 'melee') {
            rollAttackResult = await this.rollAttack();
         }
         const durationRollResult = await this.#getDurationText();

         if (rollAttackResult === null || rollAttackResult?.canAttack === true) {
            // Use spell resource
            systemData.cast += 1;
            await this.update({ "system.cast": systemData.cast });

            const chatData = {
               caller: this, // the spell
               context: instigator, // the caster
               roll: rollAttackResult?.rollEval,
               digest: rollAttackResult?.digest
            };

            const builder = new ChatFactory(CHAT_TYPE.SPELL_CAST, chatData, { durationMsg: durationRollResult });
            await builder.createChatMessage();
         }
      }
      else {
         const msg = game.i18n.format('FADE.notification.notMemorized', { actorName: this.actor.name, spellName: this.name });
         ui.notifications.warn(msg);

         // Create the chat message
         await ChatMessage.create({ content: msg });
      }

      return result;
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

   async #getDurationText() {
      let result = `${game.i18n.format('FADE.Spell.duration')}: ${this.system.duration}`;
      if (this.system.durationFormula !== '-' && this.system.durationFormula !== null) {
         const rollData = this.getRollData();
         const rollEval = await new Roll(this.system.durationFormula, rollData).evaluate();
         result = `${result} (${rollEval.total} ${game.i18n.localize('FADE.rounds')})`;
      }
      return result;
   }
}