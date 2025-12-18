export class RandomCharacterConfig {
   abilityScoreFormula: any;
   constructor(options: any = {}) {
      this.abilityScoreFormula = options?.abilityScoreFormula || "3d6";
   }
}
