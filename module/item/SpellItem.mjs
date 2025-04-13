import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class SpellItem extends fadeItem {
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

   async getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = await this.getEvaluatedRoll(isHeal ? this.system.healFormula : this.system.dmgFormula);
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
      if (caster) {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: game.i18n.localize('FADE.dialog.spellcast.title'),
            content: game.i18n.localize('FADE.dialog.spellcast.content'),
            yesLabel: game.i18n.localize('FADE.dialog.spellcast.yesLabel'),
            noLabel: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
            defaultChoice: "yes"
         }, this.actor);

         if (dialogResp?.resp?.result === true) {
            await this.doSpellcast();
         } else if (dialogResp?.resp?.result === false) {
            super.roll(dataset);
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
         const attackRollResult = await this.#doAttackRoll();
         const durationRollResult = await this.#getDurationText();

         if (attackRollResult === null || attackRollResult?.canProceed === true) {
            // Use spell resource
            systemData.cast += 1;
            await this.update({ "system.cast": systemData.cast });

            const chatData = {
               caller: this, // the spell
               context: instigator, // the caster
               roll: attackRollResult?.rollEval,
               digest: attackRollResult?.digest
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

   async #getDurationText() {
      let result = `${game.i18n.format('FADE.Spell.duration')}: ${this.system.duration}`;
      if (this.system.durationFormula !== '-' && this.system.durationFormula !== null) {
         const rollData = this.getRollData();
         const rollEval = await new Roll(this.system.durationFormula, rollData).evaluate();
         result = `${result} (${rollEval.total} ${game.i18n.localize('FADE.rounds')})`;
      }
      return result;
   }

   async #doAttackRoll() {
      if (this.system.attackType !== 'melee') {
         return null;
      }

      const caster = this.parent.getActiveTokens()?.[0] || this.actor;
      const casterActor = caster.actor || this.actor;
      const rollMode = game.settings.get("core", "rollMode");
      const rollData = this.getRollData();
      let rollEval = null;
      let canProceed = true;
      let dialogResp = null;
      let digest = [];

      try {
         const targetTokens = Array.from(game.user.targets);
         // Touch attacks can only be performed against a single opponent.
         const targetToken = targetTokens.length > 0 ? targetTokens[0] : null;
         // Get roll modification
         let dataset = {
            dialog: "spellattack",
            label: "Attack",
            rollMode
         };
         dialogResp = await DialogFactory(dataset, casterActor, { targetToken });
         if (dialogResp?.resp) {
            const rollOptions = {
               mod: dialogResp.resp.mod,
               target: targetToken?.actor,
               attackRoll: dialogResp.resp.attackRoll
            };
            if (dialogResp.resp.targetWeaponType) {
               rollOptions.targetWeaponType = dialogResp.resp.targetWeaponType;
            }

            const rollInfo = game.fade.registry.getSystem('toHitSystem').getAttackRoll(this.actor, this, this.system.attackType, rollOptions);
            rollData.formula = rollInfo.formula;
            digest = rollInfo.digest;
            const rollContext = { ...rollData };
            rollEval = await new Roll(rollData.formula, rollContext).evaluate();
         } else {
            canProceed = false;
         }
      } catch (error) {
         // Close button pressed or other error
         canProceed = false;
      }
      return { resp: dialogResp?.resp, digest, rollEval, canProceed };
   }
}