import { SYSTEM_ID } from "./config.mjs";
import { PlayerCombatForm } from "../apps/PlayerCombatForm.mjs";

// Define a unique socket namespace for your module
const FADE_SOCKET = `system.${SYSTEM_ID}`;

/**
 * SocketManager - A class to send messages to others with customizable type and data.
 */
export class SocketManager {
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
         recipient: 'gm',
         action,
         data,
         playerName: game.user.name,
      };

      // Emit the message via the socket to be received by the GM
      game.socket.emit(FADE_SOCKET, messageData);
   }


   /**
    * Send the message to all users.
    * @param {string} type - The type of message to be sent.
    * @param {object} data - Additional data to send with the message.
    */
   static sendToAllUsers(action, data = {}) {
      // Prepare the data to be sent
      const messageData = {
         recipient: 'alluser',
         action,
         data,
         playerName: game.user.name,
      };

      // Emit the message via the socket to be received by the GM
      game.socket.emit(FADE_SOCKET, messageData);
   }

   /**
    * Send the message to specific users.
    * @param userIds - The target user ID.
    * @param {string} type - The type of message to be sent.
    * @param {object} data - Additional data to send with the message.
    */
   static sendToUsers(userIds, action, data = {}) {
      // Prepare the data to be sent
      const messageData = {
         recipients: userIds,
         action,
         data,
         playerName: game.user.name,
      };

      // Emit the message via the socket to be received by the GM
      game.socket.emit(FADE_SOCKET, messageData);
   }

   receiveSocketMessage = (message) => {
      console.debug('receiveSocketMessage', message, game.user.id);
      // Ignore messages not meant for this user.
      if ((message.recipients?.length > 0 && message.recipients?.includes(game.user.id) === false)
         && (message.recipient === undefined
            || (message.recipient === 'gm' && game.user.isGM === false)
            || (message.recipient === 'alluser' && game.user.isGM === true))) {
         return;
      }

      // Handle the message based on type
      switch (message.action) {
         case "alert":
            ui.notifications.info(`${message.playerName}: ${message.data.text}`);
            break;
         case "log":
            console.log(`Log from ${message.playerName}:`, message.data);
            break;
         case "showPlayerCombat":
            new PlayerCombatForm().render(true);
            break;
         case "closePlayerCombat":
            for (const app of Object.values(ui.windows)) {
               if (app.id === PlayerCombatForm.APP_ID) {
                  app.close(); // Closes the form
               }
            }
            break;
         case "incAttacksAgainst":
            this.handleIncAttacksAgainst(message)
            break;
         case "rollGroupInitiative":
            this.handleRollGroupInitiative(message);
            break;
      }
   }

   static SetupOnReady() {
      // GM-Only: Listen for messages from players
      window.SocketManager = new SocketManager();
      game.socket.on(FADE_SOCKET, window.SocketManager.receiveSocketMessage);
      console.info(`Registered socket listener: ${FADE_SOCKET}`);
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

   handleRollGroupInitiative(message) {
      const { data } = message;
      const combat = game.combats.get(data.combatid);
      if (combat) {
         combat.rollInitiative([], { messageOptions: { group: "friendly" } });
      } else {
         console.warn("handleIncAttacksAgainst: combat not found.", data);
      }
   }
}