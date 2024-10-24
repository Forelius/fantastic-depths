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
      this.system.mastery = this.system.mastery || this.name;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareEffects();
      this._prepareModText();
   }

   getDamageRoll(attackType, attackMode) {
      const weaponData = this.system;
      const attackerToken = this.parent.getActiveTokens()?.[0];
      const attackerData = this.parent.system;
      let formula = weaponData.damageRoll;
      let digest = [];
      let modifier = 0;

      if (attackType == 'melee') {
         if (weaponData.mod.dmg != null && weaponData.mod.dmg != 0) {
            //formula = `${formula}+${weaponData.mod.dmg}`;
            modifier += weaponData.mod.dmg;
            digest.push(`Weapon mod: ${weaponData.mod.dmg}`);
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0) {
            modifier += attackerData.abilities.str.mod;
            //formula = `${formula}+${attackerData.abilities.str.mod}`;
            digest.push(`Strength mod: ${attackerData.abilities.str.mod}`);
         }
         if (attackerData.mod.combat.dmg != null && attackerData.mod.combat.dmg != 0) {
            modifier += attackerData.mod.combat.dmg;
            //formula = `${formula}+${attackerData.mod.combat.dmg}`;
            digest.push(`Attacker effect mod: ${attackerData.mod.combat.dmg}`);
         }
      } else {
         if (weaponData.mod.dmgRanged != null && weaponData.mod.dmgRanged != 0) {
            modifier += weaponData.mod.dmgRanged;
            //formula = `${formula}+${weaponData.mod.dmgRanged}`;
            digest.push(`Weapon mod: ${weaponData.mod.dmg}`);
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0 && weaponData.tags.includes("thrown")) {
            //formula = `${formula}+${attackerData.abilities.str.mod}`;
            modifier += attackerData.abilities.str.mod;
            digest.push(`Strength mod: ${attackerData.abilities.str.mod}`);
         } else if (attackerData.abilities && attackerData.abilities.dex.mod) {
            modifier += attackerData.abilities.dex.mod;
            //formula = `${formula}+${attackerData.abilities.dex.mod}`;
            digest.push(`Dexterity mod: ${attackerData.abilities.str.mod}`);
         }
         if (attackerData.mod.combat.dmgRanged != null && attackerData.mod.combat.dmgRanged != 0) {
            modifier += attackerData.mod.combat.dmgRanged;
            //formula = `${formula}+${attackerData.mod.combat.dmgRanged}`;
            digest.push(`Attacker effect mod: ${attackerData.mod.combat.dmg}`);
         }
      }

      if (modifier !== 0) {
         formula = `${formula}+${modifier}`;
      }

      // Check weapon mastery
      const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      if (weaponMastery && weaponData.mastery !== "" && attackerToken.type==="character" && attackerData.details.species === "Human") {
         const attackerMastery = attackerToken.items.find((item) => item.type === 'mastery' && item.name === weaponData.mastery);
         if (attackerMastery) {
            // do stuff
         } else {
            // Half damage if unskilled use.
            formula = `floor(${formula}/2)`;
            digest.push(`Unskilled use: /2`);
         }
      }

      return { formula, type: weaponData.damageType, digest };
   }

   /**
    * Attack modes are things like one-handed, offhand and two-handed
    */
   getAttackModes() {
      let result = [];
      const twoHanded = this.system.tags?.includes("2-handed");
      const oneHanded = this.system.tags?.includes("1-handed") || twoHanded === false;
      if (twoHanded) result.push({ text: "Two-Handed", value: "2hand" });
      if (oneHanded) result.push({ text: "One-Handed", value: "1hand" });
      return result;
   }

   getAttackTypes() {
      let result = [];
      if (this.system.canRanged) result.push({text:"Missile", value: "missile"});
      if (this.system.canMelee) result.push({ text: "Melee", value: "melee" });
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

      if (attackerToken) {
         try {
            dialogResp = await DialogFactory({ dialog: 'attack' }, this.actor, { weapon: this });
            if (dialogResp?.resp) {
               let attackRoll = this.actor.getAttackRoll(this, dialogResp.resp.attackType, dialogResp.resp.mod, attackerActor);
               rollData.formula = attackRoll.formula;
               digest = attackRoll.digest;
            } else {
               canAttack = false;
            }
         } catch (error) {
            // Close button pressed or other error
            canAttack = false;
         }

         // Check if the attack type is a missile/ranged attack
         if (canAttack && dialogResp.resp.attackType !== 'melee' && systemData.ammo.type) {
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
            const rollContext = { ...rollData, ...dialogResp.resp || {} };
            let rolled = await new Roll(rollData.formula, rollContext).evaluate();
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
      const modEffects = this.effects.filter(effect =>
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
}