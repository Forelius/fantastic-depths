export class RandomCharacterConfig {
    abilityScoreFormula;
    constructor(options = {}) {
        this.abilityScoreFormula = options?.abilityScoreFormula || "3d6";
    }
}
