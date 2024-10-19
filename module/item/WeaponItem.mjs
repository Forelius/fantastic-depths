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

   getDamageRoll(attackType, attacker) {
      const systemData = this.system;
      const attackerData = attacker.system;

      let formula = systemData.damageRoll;
      if (attackType == 'melee') {
         if (systemData.mod.dmg != null && systemData.mod.dmg != 0) {
            formula = `${formula}+${systemData.mod.dmg}`;
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0) {
            formula = `${formula}+${attackerData.abilities.str.mod}`;
         }
         if (attackerData.mod.dmg != null && attackerData.mod.dmg != 0) {
            formula = `${formula}+${attackerData.mod.dmg}`;
         }
      } else {
         if (systemData.mod.dmgRanged != null && systemData.mod.dmgRanged != 0) {
            formula = `${formula}+${systemData.mod.dmgRanged}`;
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0 && systemData.tags.includes("thrown")) {
            formula = `${formula}+${attackerData.abilities.str.mod}`;
         } else if (attackerData.abilities && attackerData.abilities.dex.mod) {
            formula = `${formula}+${attackerData.abilities.dex.mod}`;
         }
         if (attackerData.mod.dmgRanged != null && attackerData.mod.dmgRanged != 0) {
            formula = `${formula}+${attackerData.mod.dmgRanged}`;
         }
      }

      // Check weapon mastery
      const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      if (weaponMastery && systemData.mastery !== "" && attacker.type==="character" && attackerData.details.species === "Human") {
         const attackerMastery = attacker.items.find((item) => item.type === 'mastery' && item.name === systemData.mastery);
         if (attackerMastery) {
            // do stuff
         } else {
            // Half damage if unskilled use.
            formula = `floor(${formula}/2)`;
         }
      }

      return {
         formula: formula,
         type: systemData.damageType
      };
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   */
   async roll() {
      const systemData = this.system;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const label = `[${this.type}] ${this.name}`;
      const rollData = this.getRollData();
      let dialogResp;
      let canAttack = true;

      try {
         dialogResp = await DialogFactory({ dialog: 'attack' }, this.actor, { weapon: this });
         rollData.formula = this.actor.getAttackRoll(this, dialogResp.resp.attackType, dialogResp.resp.mod);
      } catch (error) {
         // Close button pressed or other error
         canAttack = false;
      }

      // Check if the attack type is a missile/ranged attack
      if (canAttack  && dialogResp.resp.attackType !== 'melee' && systemData.ammo.type) {
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
      let result = null;

      if (canAttack && dialogResp) {
         const rollContext = { ...rollData, ...dialogResp.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            resp: dialogResp.resp, // the dialog response
            caller: this, // the weapon
            context: this.actor, // the weapon owner
            roll: rolled
         };

         const builder = new ChatFactory(CHAT_TYPE.ATTACK_ROLL, chatData);

         result = builder.createChatMessage();
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