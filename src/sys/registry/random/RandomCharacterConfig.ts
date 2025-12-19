export class RandomCharacterConfig {
   abilityScoreFormula: string;
   constructor(options) {
      this.abilityScoreFormula = options?.abilityScoreFormula || "3d6";
   }
}