import { FDCombatActorDM } from "./FDCombatActorDM";
import { MonsterTHAC0Calculator } from '../../utils/MonsterTHAC0Calculator';
import { MonsterXPCalculator } from '../../utils/MonsterXPCalculator';
import { MonsterData } from '../fields/MonsterField';
export class MonsterDataModel extends FDCombatActorDM {
    static defineSchema() {
        const baseSchema = super.defineSchema();
        const monsterSchema = MonsterData.defineSchema();
        foundry.utils.mergeObject(baseSchema, monsterSchema);
        return baseSchema;
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        this.details.alignment = this.details.alignment || "Chaotic";
        this.encumbrance.max = this.encumbrance.max || 0;
        // Default all monsters with basic proficiency.
        this.combat.basicProficiency = true;
        this._prepareTHAC0ToHitBonus();
        // Maybe this is the wrong place to do this. We may need to wait until after init.
        this.thbonus = CONFIG.FADE.ToHit.baseTHAC0 - this.thac0.value;
        this._prepareHitPoints();
        this._prepareXP();
    }
    /**
     * Calculate average hitpoints based on hitdice.
     */
    _prepareHitPoints() {
        if (this.hp.max == null) {
            const classSystem = game.fade.registry.getSystem("classSystem");
            const { numberOfDice, numberOfSides, modifier } = classSystem.getParsedHD(this.hp.hd);
            this.hp.value = Math.ceil(((numberOfSides + 1) / 2) * numberOfDice) + modifier;
            this.hp.max = this.hp.value;
        }
    }
    /** Calculate experience points for killing this monster. Only works with modifiers of +/-. */
    _prepareXP() {
        if (this.details.xpAward == null || this.details.xpAward == 0) {
            const classSystem = game.fade.registry.getSystem("classSystem");
            const { numberOfDice, modifierSign, modifier } = classSystem.getParsedHD(this.hp.hd);
            const xpCalc = new MonsterXPCalculator();
            if (numberOfDice > 0 || modifier > 0) {
                const xp = xpCalc.getXP(`${numberOfDice}${modifierSign}${(modifier != 0 ? modifier : '')}`, this.details.abilityCount);
                this.details.xpAward = xp;
            }
        }
    }
    _prepareTHAC0ToHitBonus() {
        if (this.thac0?.value == null) {
            const thac0Calc = new MonsterTHAC0Calculator();
            this.thac0.value = thac0Calc.getTHAC0(this.hp.hd);
        }
    }
}
