export class ToastManager {
   constructor() {
      this.toastContainer = document.createElement('div');
      this.toastContainer.classList.add('toast-container');
      document.body.appendChild(this.toastContainer);

      this.lastToastTime = {};  // Track the last time a player sent a toast for rate-limiting
   }

   // Rate limit function to prevent spam
   #canSendToast(userId) {
      const now = Date.now();
      const lastToast = this.lastToastTime[userId] || 0;
      const cooldown = 5000; // 5-second cooldown

      if (now - lastToast >= cooldown) {
         this.lastToastTime[userId] = now;
         return true;
      }
      return false;
   }

   // Private method to create the toast
   #createToast(message, type = 'info', useHtml = false) {
      const validTypes = ['success', 'error', 'warning', 'info'];
      if (!validTypes.includes(type)) {
         type = 'info'; // Fallback to 'info' if the type is invalid
      }

      const toast = document.createElement('div');
      toast.classList.add('toast', type);
      if (useHtml === true) {
         toast.innerHTML = message;
      } else {
         toast.textContent = message;
      }

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
         this.#fadeOutToast(toast);
      }, 6000);
   }

   #fadeOutToast(toast) {
      toast.classList.add('fadeout');
      setTimeout(() => {
         if (this.toastContainer.contains(toast)) {
            this.toastContainer.removeChild(toast);
         }
      }, 500); // Match this duration with the fadeout animation time
   }

   // Public method to create a toast when a socket message is received
   createToastFromSocket(message, type = 'info', useHtml = false) {
      this.#createToast(message, type, useHtml);  // Call the private method
   }

   // Broadcast toasts to all connected players
   #broadcastToast(message, type, useHtml = false) {
      game.socket.emit(`system.${game.system.id}`, {
         action: 'showToast',
         message: message,
         type: type,
         useHtml: useHtml
      });
   }

   // Public method to show a toast and broadcast it
   showToast(message, type, rollMode = 'publicroll', useHtml = false) {
      const user = game.user;

      if (rollMode === 'publicroll') {
         // Rate limit: Prevent spamming
         if (!this.#canSendToast(user.id)) {
            ui.notifications.warn("You are sending toasts too quickly! Please wait.");
            return;
         }

         // Broadcast the toast to all players
         this.#broadcastToast(message, type, useHtml);

         // Also display the toast locally for the triggering user
         this.#createToast(message, type, useHtml);
      }
   }

   showHtmlToast(message, type, rollMode = 'publicroll') {
      this.showToast(message, type, rollMode, true);
   }
}
