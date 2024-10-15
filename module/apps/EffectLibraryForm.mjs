import { EffectManager } from "../sys/EffectManager.mjs"

export class EffectLibraryForm extends FormApplication {
	constructor() {
		super();
		this.isGM = game.user.isGM;
		this.effectMgr = new EffectManager();
	}

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.id = "active-fx-lib";
		options.title = "Effect Library";
		options.template = `systems/${game.system.id}/templates/apps/active-fx-lib.hbs`;
		options.width = 300;
		options.height = 400;
		options.resizable = true; // Make the form resizable
		options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
		return options;
	}

	getData() {
		// Retrieve all ActiveEffect definitions from the game's status effect config
		return {
			effects: CONFIG.statusEffects
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		if (this.isGM === true) {
			// Handle effect management (edit, delete, etc.) using EffectManager
			html.find('[data-action="edit"], [data-action="delete"], [data-action="create"], [data-action="toggle"]').click((event) => {
				ui.notifications.warn("Not implemented yet.");
				// Retrieve the owner if relevant (e.g., Actor or Item)
				//this.effectMgr.onManageGlobalActiveEffect(event);
			});
		}
	}
}

// Hook to add a button to open the library
//Hooks.on('renderTokenHUD', (hud, html, data) => {
//	if (game.user.isGM === true) {
//		const button = $('<div class="control-icon effect-library"><i class="fas fa-book"></i></div>');
//		button.on('click', () => {
//			new EffectLibraryForm().render(true);
//		});
//		html.find('.col.left').append(button);
//	}
//});
