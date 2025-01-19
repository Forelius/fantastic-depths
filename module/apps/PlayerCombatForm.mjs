export class PlayerCombatForm extends FormApplication {
	static APP_ID = "party-combat-form";

	constructor() {
		super();
	}

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.id = PlayerCombatForm.APP_ID;
		options.template = `systems/${game.system.id}/templates/apps/player-combat.hbs`;
		options.width = 400;
		options.height = 250;
		options.resizable = true;
		options.title = game.i18n.localize("FADE.apps.playerCombat.title");
		options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
		return options;
	}

	/**
	 * Fetch data for the form, such as tracked actors 
	 */
	getData() {
		const context = super.getData();
		context.ownedTokens = canvas.tokens.placeables.filter(token =>
			token.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
		);
		context.availableActions = Object.entries(CONFIG.FADE.CombatManeuvers)
			.map(([key, value]) => ({
				text: game.i18n.localize(`FADE.combat.maneuvers.${key}.name`),
				value: key,
			}))
			.sort((a, b) => a.text.localeCompare(b.text))
			.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {}); // Sort by the `text` property
		return context;
	}

	activateListeners(html) {
		super.activateListeners(html);

		// Listen for changes in the action select elements
		html.find(".declared-action-select").on("change", (event) => {
			const select = event.currentTarget;
			const tokenId = select.dataset.tokenId;
			const actorId = select.dataset.actorId;
			const newAction = select.value;

			// Update the action description dynamically
			const descriptionElement = $(select).closest("td").find(".action-description");
			const localizedDescription = game.i18n.localize(`FADE.combat.maneuvers.${newAction}.description`);
			descriptionElement.text(localizedDescription);

			// Optionally update the actor's system data if needed
			const actor = game.actors.get(actorId);
			if (actor) {
				actor.update({ "system.combat.declaredAction": newAction });
			}
		});
	}

	// Optionally handle close actions
	close(options) {
		return super.close(options);
	}
}
