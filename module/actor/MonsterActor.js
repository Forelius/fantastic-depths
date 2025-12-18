// actor-character
import { FDCombatActor } from './FDCombatActor.js';
import { fadeFinder } from '../utils/finder.js';
export class MonsterActor extends FDCombatActor {
    constructor(data, context) {
        /** Default behavior, just call super() and do all the default Item inits */
        super(data, context);
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        this.system.wrestling = game.fade.registry.getSystem('wrestling').calculateWrestlingRating(this);
    }
    /**
     * Intercept updateActor method call to log changes.
     * @override
     * @param {any} updateData
     * @param {any} options
     * @param {String} userId
     */
    async onUpdateActor(updateData, options, userId) {
        await super.onUpdateActor(updateData, options, userId);
        // If classAbilityAs updated...
        if (updateData.system?.details?.classAbilityAs?.length > 0) {
            const result = await fadeFinder.getClassAbilitiesByCode(this.system?.details?.classAbilityAs, this);
            if (result.classAbilityData) {
                await this.setupSpecialAbilities(result.classAbilityData);
            }
        }
        const classSystem = game.fade.registry.getSystem("classSystem");
        if (updateData.system?.details?.castAs?.length > 0) {
            await classSystem.setupMonsterClassMagic(this);
        }
        if (updateData.system?.details?.saveAs?.length > 0) {
            await this.#prepareSavingThrows(classSystem);
        }
    }
    async #prepareSavingThrows(classSystem) {
        if (this.id) {
            const saveAs = this.system.details.saveAs ?? null;
            if (saveAs) {
                const savesData = await fadeFinder.getClassSavesByCode(saveAs, this);
                if (savesData) {
                    await classSystem.setupSavingThrows(this, savesData);
                }
                else {
                    console.warn(`Invalid save-as value ${saveAs} specified for ${this.name}.`);
                }
            }
        }
    }
}
