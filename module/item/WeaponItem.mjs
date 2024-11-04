import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class WeaponItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.system.damageType = this.system.damageType || "physical";
      this.system.mastery = this.system.mastery || "";
      this.system.mastery2 = this.system.mastery2 || "";
      this.system.natural = this.system.natural || false;
      this.system.breath = this.system.breath || "";
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareEffects();
      this._prepareModText();
      this._prepareDamageRollLabel();

      const modes = this.getAttackModes();
      this.system.multiGrip = modes.find((mode) => mode.value === "2hand2");
   }

   async getDamageRoll(attackType, attackMode, resp) {
      const weaponData = this.system;
      const attackerToken = this.parent.getActiveTokens()?.[0];
      const attackerData = this.parent.system;
      let evaluatedRoll = await this.getEvaluatedRoll(weaponData.damageRoll);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let hasDamage = true;

      if (attackType === 'melee') {
         if (weaponData.mod.dmg != null && weaponData.mod.dmg != 0) {
            modifier += weaponData.mod.dmg;
            digest.push(`Weapon mod: ${weaponData.mod.dmg}`);
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0) {
            modifier += attackerData.abilities.str.mod;
            digest.push(`Strength mod: ${attackerData.abilities.str.mod}`);
         }
         if (attackerData.mod.combat.dmg != null && attackerData.mod.combat.dmg != 0) {
            modifier += attackerData.mod.combat.dmg;
            digest.push(`Attacker effect mod: ${attackerData.mod.combat.dmg}`);
         }
         if (attackMode === "2hand2") {
            formula = await this.getEvaluatedRollFormula(weaponData.damageRoll2);
         } else if (attackMode === "2hand1") {
            modifier += 1;
            digest.push(`Double grip: 1`);
         }
      } else if (attackType === 'missile') {
         if (weaponData.mod.dmgRanged != null && weaponData.mod.dmgRanged != 0) {
            modifier += weaponData.mod.dmgRanged;
            digest.push(`Weapon mod: ${weaponData.mod.dmg}`);
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0 && weaponData.tags.includes("thrown")) {
            modifier += attackerData.abilities.str.mod;
            digest.push(`Strength mod: ${attackerData.abilities.str.mod}`);
         }
         //} else if (attackerData.abilities && attackerData.abilities.dex.mod) {
         //   modifier += attackerData.abilities.dex.mod;
         //   digest.push(`Dexterity mod: ${attackerData.abilities.dex.mod}`);
         //}
         if (attackerData.mod.combat.dmgRanged != null && attackerData.mod.combat.dmgRanged != 0) {
            modifier += attackerData.mod.combat.dmgRanged;
            digest.push(`Attacker effect mod: ${attackerData.mod.combat.dmg}`);
         }
      } else if (attackType === "breath") {

      }

      if (resp?.mod && resp?.mod !== 0) {
         modifier += resp.mod;
         digest.push(`Manual mod: ${resp.mod}`);
      }

      if (modifier <= 0 && evaluatedRoll?.total <= 0) {
         hasDamage = false;
      }

      // This is where the modifiers are applied to the formula. It only supports addition mode.
      if (modifier !== 0) {
         formula = formula ? `${formula}+${modifier}` : `${modifier}`;
      }


      // Check weapon mastery
      const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      if (hasDamage && weaponMastery && weaponData.mastery !== "" && attackerToken.type === "character" && attackerData.details.species === "Human") {
         const attackerMastery = attackerToken.items.find((item) => item.type === 'mastery' && item.name === weaponData.mastery);
         if (attackerMastery) {
            // do stuff
         } else {
            // Half damage if unskilled use.
            formula = `floor(${formula}/2)`;
            digest.push(`Unskilled use: /2`);
         }
      }

      return { formula, type: weaponData.damageType, digest, hasDamage };
   }

   /**
    * Attack modes are things like one-handed, offhand and two-handed
    */
   getAttackModes() {
      let result = [];
      const twoHand = this.system.tags?.includes("2-handed");
      const oneHand = this.system.tags?.includes("1-handed");
      const breath = this.system.breath?.length > 0;
      const natural = this.system.natural === true;

      if (natural || breath) {
         result.push({ text: "Natural", value: "natural" });
      } else if (oneHand && twoHand) {
         result.push({ text: "Two-Handed", value: "2hand2" });
         result.push({ text: "One-Handed", value: "1hand" });
      } else if (twoHand) {
         result.push({ text: "Two-Handed", value: "2hand" });
      } else {
         result.push({ text: "Two-Handed", value: "2hand1" });
         result.push({ text: "One-Handed", value: "1hand" });
      }

      return result;
   }

   getAttackTypes() {
      let result = [];
      const breath = this.system.breath?.length > 0;
      if (breath) {
         result.push({ text: "Breath", value: "breath" });
      } else {
         if (this.system.canRanged) result.push({ text: "Missile", value: "missile" });
         if (this.system.canMelee) result.push({ text: "Melee", value: "melee" });
      }
      return result;
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   */
   async roll() {
      const systemData = this.system;
      // The selected token, not the actor
      const attackerToken = canvas.tokens.controlled?.[0] || this.actor.getDependentTokens()?.[0];
      const attackerActor = attackerToken?.actor; // Actor associated with the token
      const speaker = ChatMessage.getSpeaker({ actor: attackerToken });
      const label = `[${this.type}] ${this.name}`;
      const rollData = this.getRollData();
      let dialogResp;
      let canAttack = true;
      let digest = [];
      let result = null;
      let hasRoll = false;

      if (attackerToken) {
         try {
            dialogResp = await DialogFactory({ dialog: 'attack' }, this.actor, { weapon: this });
            if (dialogResp?.resp) {
               if (dialogResp.resp.attackType !== "breath") {
                  let rollOptions = { mod: dialogResp.resp.mod };
                  if (dialogResp.resp.targetType) {
                     rollOptions.targetType = dialogResp.resp.targetType;
                  }
                  let attackRoll = this.actor.getAttackRoll(this, dialogResp.resp.attackType, rollOptions);
                  rollData.formula = attackRoll.formula;
                  digest = attackRoll.digest;
                  hasRoll = true;
               }
            } else {
               canAttack = false;
            }
         } catch (error) {
            // Close button pressed or other error
            canAttack = false;
         }

         // Check if the attack type is a missile/ranged attack
         if (canAttack && dialogResp.resp.attackType === 'missile' && systemData.ammo.type) {
            // Handle ammo usage
            const currentAmmo = systemData.ammo.load; // Current ammo
            const ammoType = systemData.ammo.type;   // Ammo type (if relevant)

            // If there's no ammo, show a UI notification
            if (currentAmmo <= 0) {
               ui.notifications.warn(`No ${ammoType ? ammoType : 'ammo'} remaining!`);
               canAttack = false;
            } else {
               // Deduct 1 ammo
               systemData.ammo.load -= 1;

               // Update the weapon/item's data to reflect the new ammo count
               await this.update({ 'system.ammo.load': systemData.ammo.load });
            }
         }

         // Perform the roll if there's ammo or if it's a melee attack
         if (canAttack && dialogResp) {
            let rolled = null;
            if (hasRoll) {
               const rollContext = { ...rollData, ...dialogResp.resp || {} };
               rolled = await new Roll(rollData.formula, rollContext).evaluate();
            }
            const chatData = {
               resp: dialogResp.resp, // the dialog response
               caller: this, // the weapon
               context: attackerToken,
               roll: rolled,
               digest: digest,
            };

            const builder = new ChatFactory(CHAT_TYPE.ATTACK_ROLL, chatData);
            await builder.createChatMessage();
         }
      } else {
         ui.notifications.warn("You must have your token selected to attack");
      }

      return result;
   }

   _prepareModText() {
      const systemData = this.system;
      let toHitText = "";
      let dmgText = "";
      if (systemData.canMelee) {
         toHitText += systemData.mod.toHit ?? "0";
         dmgText += systemData.mod.dmg ?? "0";
      }
      if (systemData.canMelee === true && systemData.canRanged === true) {
         toHitText += "/";
         dmgText += "/";
      }
      if (systemData.canRanged) {
         toHitText += systemData.mod.toHitRanged ?? "0";
         dmgText += systemData.mod.dmgRanged ?? "0";
      }
      systemData.mod.toHitText = toHitText;
      systemData.mod.dmgText = dmgText;
   }

   _prepareEffects() {
      const systemData = this.system;
      systemData.mod = {
         dmg: 0,
         toHit: 0,
         dmgRanged: 0,
         toHitRanged: 0
      };

      // Filter effects that target any part of system.mod
      const modEffects = this.effects.filter(effect => effect.disabled === false &&
         effect.changes.some(change => change.key.startsWith('system.mod.'))
      );

      // Apply the modifications
      modEffects.forEach(effect => {
         effect.changes.forEach(change => {
            const key = change.key.split('.').pop(); // Extract the last part of the key (e.g., 'dmg')
            const changeValue = parseInt(change.value, 10); // Convert the value to an integer

            // Apply the change if the key exists in systemData.mod
            if (systemData.mod.hasOwnProperty(key)) {
               systemData.mod[key] += changeValue;
            } else {
               console.warn(`Key ${key} not found in systemData.mod`);
            }
         });
      });
   }

   async _prepareDamageRollLabel() {
      this.system.damageRollLabel = await this.getEvaluatedRollFormula(this.system.damageRoll);
   }
}