export class DamageSystemInterface {
   async applyDamage(actor, delta, damageType, attackType, damageSource = null) { throw new Error("Method not implemented."); }
   GetVsGroupMod(token, weaponItem) { throw new Error("Method not implemented."); }
}

export class DamageSystem extends DamageSystemInterface {
   constructor(options) {
      super(options);
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
            result = Math.min(avMitigated, -(delta+1));
         }
      }
      return result;
   }

   /**
    * Calculate damage modifier based on token's actor groups and weapon's VS Group modifiers
    * @param {Token} token - The target token
    * @param {Item} weaponItem - The weapon item with VS Group modifiers
    * @returns {number} - Total damage modifier
    */
   GetVsGroupMod(targetActor, weaponItem) {
      if (!targetActor || !weaponItem?.system?.mod?.vsGroup) {
         return null;
      }

      const actorGroups = targetActor.system.actorGroups || [];
      const vsGroupMods = weaponItem.system.mod.vsGroup;
      let totalMod = 0;
      const digest = [];

      // Check each VS Group modifier on the weapon
      for (const [groupId, modData] of Object.entries(vsGroupMods)) {
         // Find the group definition in CONFIG.FADE.ActorGroups
         const groupDef = CONFIG.FADE.ActorGroups.find(g => g.id === groupId);
         
         // Check if group applies: start with group membership, then check special rule if needed
         const isMember = actorGroups.includes(groupId);
         const groupApplies = isMember || (groupDef?.rule && this.#checkSpecialRule(token, groupDef.rule));
            
         if (groupApplies) {
            totalMod += modData.dmg || 0;
            digest.push(game.i18n.format('FADE.Chat.rollMods.vsGroupMod', { group: groupId, mod: modData.dmg }));
         }
      }

      return { mod: totalMod, digest };
   }

   /**
    * Check if a token meets the criteria for a special rule
    * @param {Token} token - The target token
    * @param {string} rule - The rule to check
    * @returns {boolean} - Whether the token meets the rule criteria
    * @private
    */
   #checkSpecialRule(token, rule) {
      const actor = token.actor;
      
      switch (rule) {
         case "enchanted":
            // Check if actor is enchanted
            return actor.system.isEnchanted === true;
            
         case "spellcaster":
            // Check if actor can cast spells (has spell levels > 0)
            return actor.system.config?.maxSpellLevel > 0;
            
         case "equippedWeapon":
            // Check if actor has any equipped weapons
            return actor.items.some(item => item.type === "weapon" && item.system.equipped === true);
            
         default:
            console.warn(`Unknown special rule: ${rule}`);
            return false;
      }
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