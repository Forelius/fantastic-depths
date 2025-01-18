import { ChatBuilder } from './ChatBuilder.mjs';
import { GMMessageSender } from '../sys/GMMessageSender.mjs'

export class AttackRollChatBuilder extends ChatBuilder {
   static template = 'systems/fantastic-depths/templates/chat/attack-roll.hbs';

   constructor(dataset, options) {
      super(dataset, options);  // Call the parent class constructor
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      this.isAAC = this.toHitSystem === 'aac';
      this.acAbbr = this.isAAC ? game.i18n.localize('FADE.Armor.abbrAAC') : game.i18n.localize('FADE.Armor.abbr');
      this.masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
   }

   getHeroicToHitTable(thac0, repeater = 0) {
      const toHitTable = [];
      // Loop through AC values from 0 down to 20
      repeater = Math.max(repeater, 0);
      let repeatOn = [-10, 2, 30];
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

      repeatOn = [-10, 2, 20, 30, 40, 50, 60, 70, 80];
      repeater = thac0 == 20 ? 1 : 0;
      toHit = thac0 == 20 ? 20 : thac0 + 1;
      // Loop through AC values from -1 down to -99
      for (let ac = -1; ac >= -99; ac--) {
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

      return toHitTable;
   }

   getClassicToHitTable(thac0) {
      const tableRow = [];
      for (let ac = -19; ac <= 19; ac++) {
         let toHit = thac0 - ac; // Calculate the roll needed to hit
         if (toHit < 2) toHit = 2; // Minimum roll of 2
         if (toHit > 20) toHit = 20; // Maximum roll of 20
         tableRow.push({ ac, toHit });
      }
      return tableRow;
   }

   /**
    * Get the lowest AC that can be hit by the specified roll and THAC0
    * @param {any} rollTotal The attack roll total
    * @param {any} thac0 The attacker's effective THAC0
    * @returns The lowest AC that this roll can hit.
    */
   getLowestACHitProcedurally(roll, rollTotal, thac0, thbonus) {
      let result = null;
      let toHitTable = [];

      // Check for automatic hit or miss
      switch (this.toHitSystem) {
         case "thac0":
            result = thac0 - rollTotal;
            break;
         case "aac":
            result = rollTotal;
            break;
         case "classic": {
            toHitTable = this.getClassicToHitTable(thac0);
            // Filter all entries that the rollTotal can hit
            const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
            // Find the lowest AC from valid entries
            if (roll === 1) {
               result = null;
            } else if (roll === 20) {
               result = -999;
            } else {
               result = validEntries.reduce((minEntry, currentEntry) => {
                  return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
               }, { ac: Infinity }).ac;
            }
            break;
         }
         case "darkdungeons": {
            if (roll === 1) {
               result = null;  // Natural 1 always misses
            } else {
               toHitTable = this.getHeroicToHitTable(thac0);
               // Filter all entries that the rollTotal can hit
               const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
               // Find the lowest AC from valid entries
               result = validEntries.reduce((minEntry, currentEntry) => {
                  return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
               }, { ac: Infinity }).ac;
            }
            break;
         }
         case "heroic":
         default: {
            toHitTable = this.getHeroicToHitTable(thac0);
            // Filter all entries that the rollTotal can hit
            const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
            // Find the lowest AC from valid entries
            result = validEntries.reduce((minEntry, currentEntry) => {
               return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
            }, { ac: Infinity }).ac;
            break;
         }
      }

      return result;
   }

   /**
    * 
    * @param {any} attacker normally the attacking token, but could also be an actor.
    * @param {any} weapon the weapon item used for the attack
    * @param {any} targetTokens an array of target tokens, if any.
    * @param {any} roll
    * @param {any} attackerWeaponType
    * @returns
    */
   async getToHitResults(attacker, weapon, targetTokens, roll, attackType = 'melee') {
      let result = null;

      if (roll) {
         const attackerWeaponType = weapon.type === 'weapon' ? weapon.system.weaponType : 'monster';
         const thac0 = attacker.actor?.system.thac0.value ?? attacker.system.thac0.value;
         const thbonus = attacker.actor?.system.thbonus ?? attacker.system.thbonus;
         const hitAC = this.getLowestACHitProcedurally(ChatBuilder.getDiceSum(roll), roll.total, thac0, thbonus);
         let hitACMessage = game.i18n.localize('FADE.Chat.attackACNone');
         if (hitAC === -999) {
            hitACMessage = game.i18n.localize('FADE.Chat.attackACAny');
         } else if (hitAC !== null && hitAC !== Infinity) {
            hitACMessage = game.i18n.format('FADE.Chat.attackAC', { acAbbr: this.acAbbr, hitAC });
         }
         result = {
            hitAC,
            message: hitACMessage,
            targetResults: []
         };

         // Target results for each individual target.
         // Warning: This is not correctly handling weapon mastery-based mods to attack roll, since attack rolls assume a single target weapon type.
         for (let targetToken of targetTokens) {
            let targetActor = targetToken.actor;
            let targetResult = {
               targetid: targetToken.id,
               targetname: targetToken.name,
               targetac: this.#getNormalTargetAC(targetToken, attackType),
               success: null,
               message: null
            };

            let ac = targetActor.system.ac?.total;
            let aac = targetActor.system.ac?.totalAAC;

            // If weapon mastery system is enabled...
            if (this.masteryEnabled === true) {
               ac = this.#calcMasteryDefenseAC(attackerWeaponType, targetResult, targetToken, ac, attackType);
            }

            if (hitAC !== null) { // null if rolled a natural 1
               if (ac !== null && ac !== undefined) {
                  if (this.isAAC === true ? aac <= hitAC : ac >= hitAC) {
                     targetResult.message = game.i18n.localize('FADE.Chat.attackSuccess');
                     targetResult.success = true;
                  } else {
                     targetResult.success = false;
                     targetResult.message = game.i18n.localize('FADE.Chat.attackFail');
                  }
               } else {
                  targetResult.message = game.i18n.format('FADE.Chat.attackAC', { acAbbr: this.acAbbr, hitAC });
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
    * Calculate the AC based on weapon mastery rules.
    * @private
    * @param {any} attackerWeaponType
    * @param {any} targetResult
    * @param {any} targetToken
    * @param {any} ac The effective AC for this attack.
    * @returns
    */
   #calcMasteryDefenseAC(attackerWeaponType, targetResult, targetToken, ac, attackType) {
      const defenseMastery = targetToken.actor.getBestDefenseMastery(attackerWeaponType);
      if (defenseMastery && defenseMastery.acBonus !== Infinity) {
         // Normal AC/Mastery Def. AC
         const useMasteryAC = targetToken.actor.system.combat.attacksAgainst < defenseMastery.acBonusAT
            && targetToken.actor.system.ac?.totalRanged > defenseMastery.total;
         targetResult.targetac = this.#getMasteryDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType);
         if (useMasteryAC) {
            ac = defenseMastery.total;
         }
      }
      return ac;
   }

   /**
    * Creates the DM's view of an attack result for the specified target.
    * @param {any} targetToken
    * @param {any} attackType
    * @returns
    */
   #getNormalTargetAC(targetToken, attackType) {
      return game.i18n.format('FADE.Chat.targetAC', {
         cssClass: attackType === 'melee' ? "style='color:green'" : "",
         acTotal: this.isAAC ? targetToken.actor.system.ac?.totalAAC : targetToken.actor.system.ac?.total,
         targetRangedAc: targetToken.actor.system.ac?.totalRanged !== targetToken.actor.system.ac?.total
            ? game.i18n.format('FADE.Chat.targetRangedAC', {
               acTotal: this.isAAC ? targetToken.actor.system.ac?.totalRangedAAC : targetToken.actor.system.ac?.totalRanged,
               cssClass: attackType === 'missile' ? "style='color:green'" : ""
            })
            : ""
      });
   }

   /**
    * Creates the DM's view of an attack result for the specified target. Also indicates how weapon mastery factored into AC calculation.
    * @param {any} useMasteryAC Whether the system determined the weapon mastery defense bonus applied to this attack or not.
    * @param {any} targetToken The token being attacked.
    * @param {any} defenseMastery The token actor's most applicable defense mastery.
    * @returns Localized html message;
    */
   #getMasteryDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType) {
      return game.i18n.format('FADE.Chat.targetACDefMastery', {
         cssClass: (useMasteryAC === false && attackType === 'melee' ? "style='color:green'" : ""),
         cssClassMastery: (useMasteryAC ? "style='color:green'" : ""),
         acTotal: this.isAAC ? targetToken.actor.system.ac?.totalAAC : targetToken.actor.system.ac?.total,
         targetRangedAc: targetToken.actor.system.ac?.totalRanged !== targetToken.actor.system.ac?.total
            ? game.i18n.format('FADE.Chat.targetRangedAC', {
               acTotal: this.isAAC ? targetToken.actor.system.ac?.totalRangedAAC : targetToken.actor.system.ac?.totalRanged,
               cssClass: (!useMasteryAC && attackType === 'missile' ? "style='color:green'" : "")
            })
            : "",
         attacksAgainst: targetToken.actor.system.combat.attacksAgainst,
         maxAttacksAgainst: defenseMastery.acBonusAT,
         defenseMasteryTotal: this.isAAC ? (19 - defenseMastery.total) : defenseMastery.total
      });
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

      const toHitResult = await this.getToHitResults(attacker, caller, targetTokens, roll, resp.attackType);
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