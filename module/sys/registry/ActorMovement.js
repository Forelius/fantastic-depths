export class ActorMovement {
    static prepareMovementRates(actor) {
        const roundDivisor = game.settings.get(game.system.id, "mvRoundDivisor") ?? 3;
        const runDivisor = game.settings.get(game.system.id, "runRoundDivisor") ?? 1.5;
        if (actor.system.encumbrance.mv > 0) {
            actor.system.movement.turn = actor.system.encumbrance.mv;
            actor.system.movement.round = Math.floor(actor.system.movement.turn / roundDivisor);
            actor.system.movement.day = Math.floor(actor.system.movement.turn / 5);
            actor.system.movement.run = Math.floor(actor.system.movement.turn / runDivisor);
        }
        else {
            console.debug(`No movement specified for ${actor.name}`);
        }
        if (actor.system.encumbrance.mv2 > 0) {
            actor.system.movement2.turn = actor.system.encumbrance.mv2;
            actor.system.movement2.round = Math.floor(actor.system.movement2.turn / roundDivisor);
            actor.system.movement2.day = Math.floor(actor.system.movement2.turn / 5);
            actor.system.movement2.run = Math.floor(actor.system.movement2.turn / runDivisor);
        }
        else {
            console.debug(`No movement2 specified for ${actor.name}`);
        }
    }
}
