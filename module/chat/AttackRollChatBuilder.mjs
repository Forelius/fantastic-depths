import { ChatBuilder } from './ChatBuilder.mjs';
import { GMMessageSender } from '../sys/GMMessageSender.mjs'

export class AttackRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/attack-roll.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
   }

   /**
    * Get the lowest AC that can be hit by the specified roll and THAC0
    * @param {any} rollTotal The attack roll total
    * @param {any} thac0 The attacker's effective THAC0
    * @returns The lowest AC that this roll can hit.
    */
   static getLowestACHitProcedurally(roll, rollTotal, thac0) {
      let result = null;
      let toHitTable = [];

      // Check for automatic hit or miss
      if (roll === 1) {
         result = null;  // Natural 1 always misses
         //} else if (roll === 20) {
         // result = -100;  // Natural 20 always hits the lowest possible AC (assuming -50 is the extreme)
      } else {
         // Loop through AC values from 19 down to -20
         let repeater = 0;
         let repeatOn = [-10, 2, 20, 30, 40, 50];
         let toHit = thac0;
         for (let ac = 0; ac < 20; ac++) {
            if (repeatOn.includes(toHit)) {
               if (repeater < 5) {
                  repeater++;
                  toHitTable.push({ ac, toHit });
               } else {
                  repeater = 0;
                  toHit -= 1;
                  toHitTable.push({ ac, toHit });
                  toHit -= 1;
               }
            } else {
               repeater = 0;
               toHitTable.push({ ac, toHit });
               toHit -= 1;
            }
         }
         repeater = 0;
         toHit = thac0 + 1;
         for (let ac = -1; ac >= -20; ac--) {
            if (repeatOn.includes(toHit)) {
               if (repeater < 5) {
                  repeater++;
                  toHitTable.push({ ac, toHit });
               } else {
                  repeater = 0;
                  toHit += 1;
                  toHitTable.push({ ac, toHit });
                  toHit += 1;
               }
            } else {
               repeater = 0;
               toHitTable.push({ ac, toHit });
               toHit += 1;
            }
         }

         // Filter all entries that the rollTotal can hit
         const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
         // Find the lowest AC from valid entries
         result = validEntries.reduce((minEntry, currentEntry) => {
            return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
         }, { ac: Infinity }).ac;
      }

      return result;
   }

   /**
    * 
    * @param {any} attacker normally the attacking token, but could also be an actor.
    * @param {any} weapon the weapon item used for the attack
    * @param {any} targetTokens an array of target tokens, if any.
    * @param {any} roll
    * @param {any} targetWeaponType
    * @returns
    */
   static async getToHitResults(attacker, weapon, targetTokens, roll, targetWeaponType = null) {
      let result = null;

      if (roll) {
         const thac0 = attacker.actor?.system.thac0.value ?? attacker.system.thac0.value;
         const hitAC = AttackRollChatBuilder.getLowestACHitProcedurally(ChatBuilder.getDiceSum(roll), roll.total, thac0);
         result = {
            hitAC,
            message: (hitAC !== null && hitAC !== Infinity)
               ? game.i18n.format('FADE.Chat.attackAC', { hitAC })
               : game.i18n.format('FADE.Chat.attackACNone'),
            targetResults: []
         };

         // Target results for each individual target.
         // Warning: This is not correctly handling weapon mastery-based mods to attack roll, since attack rolls assume a single target weapon type.
         for (let targetToken of targetTokens) {
            let targetActor = targetToken.actor;
            let targetResult = {
               targetid: targetToken.id,
               targetname: targetToken.name,
               targetac: `${targetToken.actor.system.ac?.total}`, // regular ac
               success: null,
               message: null
            };

            let ac = targetActor.system.ac?.total;

            const defenseMasteries = targetActor.system.ac.mastery;
            if (targetWeaponType && defenseMasteries?.length > 0) {
               const defenseMastery = defenseMasteries.filter(mastery => mastery.acBonusType === targetWeaponType)
                  .reduce((minMastery, current) =>
                     current.acBonus < minMastery.acBonus ? current : minMastery
                     , { acBonus: Infinity });

               if (defenseMastery && defenseMastery.acBonus !== Infinity) {
                  // Normal AC/Mastery Def. AC
                  const isApplicable = targetActor.system.combat.attacksAgainst < defenseMastery.acBonusAT;
                  targetResult.targetac = game.i18n.format('FADE.Chat.targetACDefMastery', {
                     cssClass: (isApplicable ? "" : "style='color:green'"),
                     acTotal: targetToken.actor.system.ac?.total,
                     attacksAgainst: targetActor.system.combat.attacksAgainst,
                     maxAttacksAgainst: defenseMastery.acBonusAT,
                     defenseMasteryTotal: defenseMastery.total
                  });
                  //                  targetResult.targetac = `<span title='Normal AC' ${isApplicable ? "" : "style='color:green'"}>${targetToken.actor.system.ac?.total}</span>/
                  //<span ${isApplicable ? "style='color:green'" : ""} data-tooltip='Best weapon mastery AC. Attacked ${targetActor.system.combat.attacksAgainst} times.'>${defenseMastery.total}</span>`;
                  if (isApplicable) {
                     ac = defenseMastery.total;
                  }
               }
            }

            if (hitAC !== null) { // null if rolled a natural 1
               if (ac !== null && ac !== undefined) {
                  if (ac >= hitAC) {
                     targetResult.message = game.i18n.localize('FADE.Chat.attackSuccess');
                     targetResult.success = true;
                  } else {
                     targetResult.success = false;
                     targetResult.message = game.i18n.localize('FADE.Chat.attackFail');
                  }
               } else {
                  targetResult.message = game.i18n.format('FADE.Chat.attackAC', { hitAC: hitAC });
                  targetResult.success = true;
               }
            } else {
               targetResult.success = false;
               targetResult.message = game.i18n.localize('FADE.Chat.attackFail');
            }

            // Track number of attacks against target. Do it after getting the tohit result;
            GMMessageSender.sendToGM("incAttacksAgainst", { tokenid: targetToken.id });

            result.targetResults.push(targetResult);
         }
      } else if (weapon.system.breath?.length > 0 && weapon.system.savingThrow === 'breath') {
         // Always hits, but saving throw
         result = {
            savingThrow: weapon.system.savingThrow,
            //message: 'Saving throw required.',
            targetResults: []
         };
         for (let targetToken of targetTokens) {
            const saveLocalized = game.i18n.localize(`FADE.Actor.Saves.${weapon.system.savingThrow}.abbr`);
            let targetResult = {
               targetid: targetToken.id,
               targetname: targetToken.name,
               message: `save vs. ${saveLocalized}`
            };
            result.targetResults.push(targetResult);
         }
      }

      return result;
   }

   /**
    * Called by the various Actor and Item derived classes to create a chat message.
    */
   async createChatMessage() {
      const { caller, context, resp, roll, mdata, digest } = this.data;
      const attacker = context;
      const attackerName = attacker.name;
      const targetTokens = Array.from(game.user.targets);
      const rollMode = mdata?.rollmode || game.settings.get("core", "rollMode");

      let descData = {
         attackerid: attacker.id,
         attacker: attackerName,
         attackType: resp.attackType,
         weapon: caller.name
      };
      const description = game.i18n.format('FADE.Chat.attackFlavor', descData);

      let rollContent = null;
      if (roll) {
         rollContent = await roll.render();
      }

      const toHitResult = await AttackRollChatBuilder.getToHitResults(attacker, caller, targetTokens, roll);
      const damageRoll = await caller.getDamageRoll(resp.attackType, resp.attackMode, null, resp.targetWeaponType);

      if (window.toastManager) {
         const toast = `${description}${(toHitResult?.message ? toHitResult.message : '')}`;
         window.toastManager.showHtmlToast(toast, "info", rollMode);
      }

      const chatData = {
         damageRoll,
         rollContent,
         description,
         descData,
         toHitResult,
         digest: digest,
         weapon: caller,
         resp,
         targetWeaponType: resp.targetWeaponType,
      };

      let content = await renderTemplate(this.template, chatData);
      // Manipulated the dom to place digest info in roll's tooltip
      content = this.moveDigest(content);

      const rolls = roll ? [roll] : null;
      const chatMessageData = await this.getChatMessageData({
         content,
         rolls,
         rollMode,
         flags: {
            [game.system.id]: {
               targets: toHitResult.targetResults
            }
         }
      });
      const chatMsg = await ChatMessage.create(chatMessageData);
   }
}