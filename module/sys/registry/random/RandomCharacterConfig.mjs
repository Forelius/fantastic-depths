export class RandomCharacterConfig {
  constructor(options = {}) {
    this.abilityScoreFormula = options?.abilityScoreFormula || "3d6";
  }
}