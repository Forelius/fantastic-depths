import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpellItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
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
         this.doSpellcast();
      } else if (dialogResp?.resp?.result === false) {
         super.roll(dataset);
      }
   }

   async doSpellcast() {
      const systemData = this.system;
      const itemLink = `@UUID[Actor.${this.actor.id}.Item.${this.id}]{${this.name}}`;

      if (systemData.cast < systemData.memorized) {
         const targets = game.user.targets;
         const targetNamesArray = Array.from(targets).map(target => target.name).filter(Boolean);
         const targetNames = targetNamesArray.length > 1
            ? targetNamesArray.slice(0, -1).join(", ") + " and " + targetNamesArray.slice(-1)
            : targetNamesArray[0] || "";
         const msg = targetNamesArray.length > 0
            ? `${this.actor.name} casts ${itemLink} at ${targetNames}!`
            : `${this.actor.name} casts ${itemLink}!`

         systemData.cast += 1;
         await this.update({ "system.cast": systemData.cast });

         // Create the chat message
         await ChatMessage.create({ content: msg });
      } else {
         const msg = `${this.actor.name} tries to cast ${this.name}, but the spell is not memorized.`;
         ui.notifications.warn(msg);

         // Create the chat message
         await ChatMessage.create({ content: msg });
      }
   }
}