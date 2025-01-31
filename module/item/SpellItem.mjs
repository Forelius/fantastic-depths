import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpellItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
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
      let evaluatedRoll = await this.getEvaluatedRoll(isHeal ? this.system.healFormula : this.system.dmgFormula);
      let formula = evaluatedRoll?.formula;
      let digest = [];
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
         damageType: isHeal ? "heal" : "magic",
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
      const caster = this.parent.getActiveTokens()?.[0] || this.actor;
      const casterActor = caster.actor || this.actor;
      const systemData = this.system;
      let result = null;

      if (systemData.cast < systemData.memorized) {
         const rollData = this.getRollData();
         const rollMode = game.settings.get("core", "rollMode");
         let canProceed = true;
         let digest = [];
         let hasAttackRoll = systemData.attackType === 'melee';
         let rolled = null;
         let dialogResp = null;

         if (hasAttackRoll) {
            try {
               const targetTokens = Array.from(game.user.targets);
               const targetToken = targetTokens.length > 0 ? targetTokens[0] : null;
               // Get roll modification
               let dataset = {
                  dialog: "spellattack",
                  label: "Attack",
                  rollMode
               };
               dialogResp = await DialogFactory(dataset, casterActor, { targetToken: targetToken });
               if (dialogResp?.resp) {
                  const rollOptions = {
                     mod: dialogResp.resp.mod,
                     target: targetToken?.actor
                  };
                  if (dialogResp.resp.targetWeaponType) {
                     rollOptions.targetWeaponType = dialogResp.resp.targetWeaponType;
                  }
                  let attackRoll = casterActor.getAttackRoll(this, systemData.attackType, rollOptions);
                  rollData.formula = attackRoll.formula;
                  digest = attackRoll.digest;
                  const rollContext = { ...rollData };
                  rolled = await new Roll(rollData.formula, rollContext).evaluate();
               } else {
                  canProceed = false;
               }
            } catch (error) {
               // Close button pressed or other error
               canProceed = false;
            }
         }

         if (canProceed) {
            systemData.cast += 1;
            await this.update({ "system.cast": systemData.cast });

            const chatData = {
               rollData,
               caller: this, // the spell
               context: (caster || casterActor), // the caster
               roll: rolled,
               resp: dialogResp?.resp,
               digest
            };

            const builder = new ChatFactory(CHAT_TYPE.SPELL_CAST, chatData);
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
}