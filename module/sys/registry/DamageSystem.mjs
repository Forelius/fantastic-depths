export class DamageSystem  {
   constructor(options) {
      this.options = options;
   }

   /**
    * Applies damage or healing to the actor.
    * @public
    * @param {any} actor
    * @param {any} delta The delta to change the HP by. A positive value indicate healing and negative indicates damage.
    * @param {any} damageType What type of damage is being done.
    * @param {*} attackType Melee or missile attack.
    * @param {any} damageSource (optional) The weapon, spell or other item that caused the damage.
    */
   async ApplyDamage(actor, delta, damageType, attackType, damageSource = null) {
      this.useAV = this.useAV === undefined ? game.settings.get(game.system.id, "useArmorValue") : this.useAV;
      const systemData = actor.system;
      const tokenName = actor.parent?.name ?? actor.name;
      let finalDelta = delta;
      const prevHP = systemData.hp.value;
      let finalHP = Math.min((systemData.hp.value + finalDelta), systemData.hp.max);
      let digest = [];
      const isHeal = delta > 0;

      if (isHeal) {
         // Restoring HP
         digest.push(game.i18n.format("FADE.Chat.damageRoll.restored", { hp: (finalHP - prevHP), tokenName: tokenName }));
      } else {
         // Damage!
         const mitigated = this.#mitigateDamage(damageType, actor, finalDelta);

         if (mitigated !== 0) {
            finalDelta += mitigated;
            digest.push(game.i18n.format("FADE.Chat.damageRoll.mitigated", { damage: mitigated, type: damageType }));
         }
         finalHP = prevHP + finalDelta;
         digest.push(game.i18n.format("FADE.Chat.damageRoll.applied", { damage: -finalDelta, type: damageType, tokenName: tokenName }));
      }

      await actor.update({ "system.hp.value": finalHP });

      this.#sendChatAndToast(damageSource, digest);
   }

   /**
    * Calculate damage modifier based on token's actor groups and weapon's VS Group modifiers
    * @param {any} targetActor - The target actor
    * @param {Item} modierItem - The weapon/ammo item with VS Group modifiers
    * @returns {any} - An object with mod (total damage modifier) and digest properties.
    */
   GetVsGroupMod(targetActor, modierItem) {
      if (!targetActor || !modierItem?.system?.mod?.vsGroup) {
         return null;
      }

      const actorGroups = targetActor.system.actorGroups || [];
      const vsGroupMods = modierItem.system.mod.vsGroup;
      let totalMod = 0;
      const digest = [];

      // Check each VS Group modifier on the weapon
      for (const [groupId, modData] of Object.entries(vsGroupMods)) {
         // Find the group definition in CONFIG.FADE.ActorGroups
         const groupDef = CONFIG.FADE.ActorGroups.find(g => g.id === groupId);

         // Check if group applies: start with group membership, then check special rule if needed
         const isMember = actorGroups.includes(groupId);
         const groupApplies = isMember || (groupDef?.rule && this.checkSpecialRule(targetActor, groupDef.rule, modData));

         if (groupApplies) {
            totalMod += modData.dmg || 0;
            digest.push(game.i18n.format('FADE.Chat.rollMods.vsGroupMod', { group: groupId, mod: modData.dmg }));
         }
      }

      return { mod: Number(totalMod), digest };
   }

   /**
    * Check if a token meets the criteria for a special rule
    * @param {any} actor - The target actor
    * @param {string} rule - The rule to check
    * @returns {boolean} - Whether the token meets the rule criteria
    * @private
    */
   checkSpecialRule(actor, rule, modData) {
      let result = false;
      switch (rule) {
         case "enchanted":
            // Check if actor is enchanted
            result = actor.system.isEnchanted === true;
            break;
         case "spellcaster":
            // Check if actor can cast spells (has spell levels > 0)
            result = actor.system.config?.maxSpellLevel > 0;
            break;
         case "equippedWeapon":
            // Check if actor has any equipped weapons
            result = actor.items.some(item => item.type === "weapon" && item.system.equipped === true && item.system.natural === false);
            break;
         case "alignment":
            // Check if actor alignment matches
            result = actor.system.details.alignment == modData.special;
            break;
         case "name":
            // Check if actor name starts with...
            result = actor.name.startsWith(modData.special);
            break;
         default:
            console.warn(`Unknown special rule: ${rule}`);
            break;
      }
      return result;
   }

   getMeleeDamageScale(weapon, digest, attackerData, targetActor) {
      let result = 1;
      if (attackerData.mod.combat.dmgScale != null && attackerData.mod.combat.dmgScale != 1) {
         result = Number(attackerData.mod.combat.dmgScale);
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectScale", { scale: attackerData.mod.combat.dmgScale }));
      }
      return result;
   }

   getMeleeDamageMod(weapon, digest, attackerData, targetActor) {
      let modifier = 0;
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const weaponData = weapon.system;

      if (weaponData.mod.dmg != null && weaponData.mod.dmg != 0) {
         modifier += weaponData.mod.dmg;
         digest.push(game.i18n.format("FADE.Chat.rollMods.weaponMod", { mod: weaponData.mod.dmg }));
      }
      // If the attacker has ability scores mods...
      if (abilityScoreSys.hasMeleeDamageMod(attackerData)) {
         const abilityScoreMod = abilityScoreSys.getMeleeDamageMod(attackerData);
         modifier += abilityScoreMod;
         digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
      }
      if (attackerData.mod.combat.dmg != null && attackerData.mod.combat.dmg != 0) {
         modifier += Number(attackerData.mod.combat.dmg);
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod", { mod: attackerData.mod.combat.dmg }));
      }
      if (targetActor) {
         const vsGroupResult = this.GetVsGroupMod(targetActor, weapon);
         if (vsGroupResult != null && vsGroupResult.mod != 0) {
            modifier += Number(vsGroupResult.mod);
            digest.push(...vsGroupResult.digest);
         }
      }
      return modifier;
   }

   getMissileDamageMod(weapon, digest, attackerData, targetActor, ammoItem) {
      let modifier = 0;
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const weaponData = weapon.system;

      if (weaponData.mod.dmgRanged != null && weaponData.mod.dmgRanged != 0) {
         modifier += Number(weaponData.mod.dmgRanged);
         digest.push(game.i18n.format("FADE.Chat.rollMods.weaponMod", { mod: weaponData.mod.dmgRanged }));
      }
      // If the attacker has ability scores...
      if (abilityScoreSys.hasMeleeDamageMod(attackerData) && weaponData.tags.includes("thrown")) {
         const abilityScoreMod = abilityScoreSys.getMeleeDamageMod(attackerData);
         modifier += abilityScoreMod;
         digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
      }
      if (attackerData.mod.combat.dmgRanged != null && attackerData.mod.combat.dmgRanged != 0) {
         modifier += Number(attackerData.mod.combat.dmgRanged);
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod", { mod: attackerData.mod.combat.dmgRanged }));
      }
      // Bow, sling or thrown has vs group modifier?
      if (targetActor) {
         const vsGroupResult = this.GetVsGroupMod(targetActor, weapon);
         if (vsGroupResult != null && vsGroupResult.mod != 0) {
            modifier += Number(vsGroupResult.mod);
            digest.push(...vsGroupResult.digest);
         }
      }
      // If there is an ammo item and it isn't the weapon itself (thrown)...
      if (ammoItem) {
         if (Math.abs(ammoItem?.system.mod?.dmgRanged) > 0) {
            modifier += Number(ammoItem?.system.mod.dmgRanged);
            digest.push(game.i18n.format("FADE.Chat.rollMods.ammoMod", { mod: ammoItem?.system.mod.dmgRanged }));
         }
         if (ammoItem?.id != weapon.id) {
            // Non-thrown ammo item vs group modifier
            if (targetActor) {
               const vsGroupResult = this.GetVsGroupMod(targetActor, weapon);
               if (vsGroupResult != null && vsGroupResult.mod != 0) {
                  modifier += Number(vsGroupResult.mod);
                  digest.push(...vsGroupResult.digest);
               }
            }
         }
      }
      return modifier;
   }

   #mitigateDamage(damageType, actor, delta) {
      let result = 0;
      const combatMods = actor.system.mod.combat;
      const physicalTypes = ["physical", "fire", "frost", "piercing", "breath", "corrosive", ""];
      if (physicalTypes.includes(damageType)) {
         result += this.#getPhysicalMitigation(actor, damageType, delta);
      }
      if (damageType === "breath") {
         result += combatMods.selfDmgBreath;
         result += -delta * combatMods.selfDmgBreathScale;
      }
      if (damageType === "magic") {
         result += combatMods.selfDmgMagic;
      }
      // Don't allow addition of damage via damage mitigation
      // And don't allow mitigation of more damage than was caused.
      result = Math.min(result, -delta);
      return result;
   }

   #getPhysicalMitigation(actor, damageType, delta) {
      let result = actor.system.mod.combat.selfDmg;
      if (this.useAV) {
         const av = actor.getEvaluatedRollSync(actor.system.ac.av)?.total;
         if (av > 0) {
            let avMitigated = 0;
            if (damageType === 'piercing') {
               avMitigated += Math.floor(av / 2);
            } else {
               avMitigated += av;
            }
            // Blocks at least 1 point.
            result = Math.min(avMitigated, -(delta + 1));
         }
      }
      return result;
   }

   #sendChatAndToast(source, digest) {
      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (let msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
      }

      const speaker = { alias: game.users.get(game.userId).name }; // Use the player's name as the speaker
      let chatData = {
         speaker: speaker,
         content: chatContent
      };
      ChatMessage.create(chatData);
   }
}