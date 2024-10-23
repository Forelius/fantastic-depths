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

      systemData.targetSelf = systemData.targetSelf || true;
      systemData.targetOther = systemData.targetOther || true;
      systemData.dmgFormula = systemData.dmgFormula || null;
      systemData.maxTargetFormula = systemData.maxTargetFormula || 1;
      systemData.durationFormula = systemData.durationFormula || null;      
   }

   getDamageRoll() {
      return {
         formula: this.system.dmgFormula,
         damageType: "magic"
      };
   }

   /**
   * Handle clickable rolls.
   * @override
   * @private
   */
   async roll(dataset) {
      const item = this;
      const systemData = this.system;
      const ownerData = this.actor.system;

      const dialogResp = await DialogFactory({
         dialog: "yesno",
         title: "Cast Spell?",
         content: "Do you want to cast the spell or view its description?",
         yesLabel: "Cast Spell",
         noLabel: "View Description",
         defaultChoice: "yes"
      }, this.actor);

      if (dialogResp?.resp?.result === true) {
         await this.doSpellcast();
      } else if (dialogResp?.resp?.result === false) {
         super.roll(dataset);
      }

      return null;
   }

   async doSpellcast() {
      const systemData = this.system;
      const casterToken = canvas.tokens.controlled?.[0] || this.actor.getDependentTokens()?.[0]; 
      const itemLink = `@UUID[Actor.${this.actor.id}.Item.${this.id}]{${this.name}}`;

      if (systemData.cast < systemData.memorized) {
         systemData.cast += 1;
         await this.update({ "system.cast": systemData.cast });

         const chatData = {
            caller: this, // the spell
            context: casterToken, // the caster
            options: { 
               itemLink
            }
         };

         const builder = new ChatFactory(CHAT_TYPE.SPELL_CAST, chatData);
         await builder.createChatMessage();
      } else {
         const msg = `${this.actor.name} tries to cast ${this.name}, but the spell is not memorized.`;
         ui.notifications.warn(msg);

         // Create the chat message
         await ChatMessage.create({ content: msg });
      }
   }
}