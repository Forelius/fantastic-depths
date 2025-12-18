import { FDCombatActor } from "./FDCombatActor.js";
/**
 * Extends the basic actor class with modifications for all system actors.
 * @extends {FDCombatActor}
 */
export class FDVehicleActor extends FDCombatActor {
    constructor(data, context) {
        super(data, context);
    }
    /**
     * Pre-create method. Being used to set some defaults on the prototype token.
     * override
     * @param {any} documents Pending document instances to be created
     * @param {any} operation Parameters of the database creation operation
     * @param {any} user The User requesting the creation operation
     * @returns Return false to cancel the creation operation entirely
     */
    async _preCreate(documents, operation, user) {
        const allowed = await super._preCreate(documents, operation, user);
        // Skip if the document is being created within a compendium
        if (this.pack || this._id) {
            return allowed;
        }
        const fdPath = `systems/fantastic-depths/assets/img/actor`;
        const changeData = {};
        const assignIfUndefined = (oldData, newData, key, value) => {
            if (!foundry.utils.getProperty(oldData, key)) {
                foundry.utils.setProperty(newData, key, value);
            }
        };
        switch (this.type) {
            case "vehicle":
                Object.assign(changeData, {
                    "prototypeToken.sight.enabled": true,
                    "prototypeToken.sight.visionMode": "basic"
                });
                assignIfUndefined(documents, changeData, "img", `${fdPath}/fighter1.webp`);
                assignIfUndefined(documents, changeData, "prototypeToken.texture.src", `${fdPath}/fighter1a.webp`);
                assignIfUndefined(documents, changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.FRIENDLY);
                assignIfUndefined(documents, changeData, "prototypeToken.actorLink", true);
                assignIfUndefined(documents, changeData, "prototypeToken.scale", 0.9);
                assignIfUndefined(documents, changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.HOVER);
                break;
        }
        // Update the document with the changed data if it's a new actor
        if (Object.keys(changeData).length) {
            this.updateSource(changeData); // updateSource instead of update, no _id needed
        }
        return allowed;
    }
}
