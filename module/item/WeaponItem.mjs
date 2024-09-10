import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class WeaponItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      //console.log("WeaponItem constructor");
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      //console.log("WeaponItem.prepareDerivedData()", this);
      this._prepareEffects();
      this._prepareModText();
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }

   /**
 * Handle clickable rolls.
 * @param {Event} event The originating click event
 */
   async roll(dataset) {
      const systemData = this.system;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${this.type}] ${this.name}`;
      const rollData = this.getRollData();
      let dialogResp;

      dataset.dialog = "attack";
      try {
         dialogResp = await DialogFactory(dataset, this.actor, { weapon: this });
         rollData.formula = dialogResp.resp.mod != 0 ? '1d20+@mod' : '1d20';
         //console.log("roll dialog", dialogResp);
         if (dialogResp.resp.attackType === "melee") {
            rollData.formula = systemData.mod.toHit ? `${rollData.formula}+${systemData.mod.toHit}` : rollData.formula;
         } else {
            // missile
            rollData.formula = systemData.mod.toHit ? `${rollData.formula}+${systemData.mod.toHitRanged}` : rollData.formula;
         }
      }
      // If close button is pressed
      catch (error) {
         // Shhhh
      }

      let result = null;
      if (dialogResp !== null) {
         const rollContext = { ...rollData, ...dialogResp.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            resp: dialogResp.resp,
            caller: this,
            context: this.actor,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.ATTACK_ROLL, chatData);
         return builder.createChatMessage();
      }
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