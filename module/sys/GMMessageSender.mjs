import { SYSTEM_ID } from "./config.mjs";

// Define a unique socket namespace for your module
const SOCKET_NAMESPACE = `system.${SYSTEM_ID}`;

/**
 * GMMessageSender - A class to send messages to the GM with customizable type and data.
 */
export class GMMessageSender {
   constructor() {
   }

   /**
    * Send the message to the GM.
    * @param {string} type - The type of message to be sent.
    * @param {object} data - Additional data to send with the message.
    */
   static sendToGM(action, data = {}) {
      // Prepare the data to be sent
      const messageData = {
         action,
         data,
         playerName: game.user.name,
      };

      // If GM, just handle message.
      if (game.user.isGM) {
         window.GMMessageSender.receiveSocketMessage(messageData);
      } else {
         // Emit the message via the socket to be received by the GM
         game.socket.emit(SOCKET_NAMESPACE, messageData);
      }
   }

   handleIncAttacksAgainst(message) {
      const { data } = message;
      const targetActor = canvas.tokens.get(data.tokenid)?.actor;
      if (targetActor) {
         targetActor.update({ "system.combat.attacksAgainst": targetActor.system.combat.attacksAgainst + 1 });
      } else {
         console.warn("handleIncAttacksAgainst: targetActor not found.", data);
      }
   }

   receiveSocketMessage = (message) => {
      // Handle the message based on type
      switch (message.action) {
         case "alert":
            ui.notifications.info(`Player ${message.playerName} says: ${message.data.text}`);
            break;
         case "log":
            console.log(`Log from ${message.playerName}:`, message.data);
            break;
         case "incAttacksAgainst":
            this.handleIncAttacksAgainst(message)
            break;
      }
   }

   static SetupOnReady() {
      // GM-Only: Listen for messages from players
      if (game.user.isGM) {
         window.GMMessageSender = new GMMessageSender();
         game.socket.on(SOCKET_NAMESPACE, window.GMMessageSender.receiveSocketMessage);
      }
   }
}