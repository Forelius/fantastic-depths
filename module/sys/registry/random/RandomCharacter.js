import { CodeMigrate } from '../../migration.js';
import { CharacterDataModel } from '../../../actor/dataModel/CharacterDataModel.js';
export class RandomCharacter {
    static async create(config) {
        const characterData = new CharacterDataModel();
        await RandomCharacter.rollAbilityScores(characterData, config);
        console.debug(characterData);
    }
    static async rollAbilityScores(characterData, config) {
        const formula = config.abilityScoreFormula;
        // Roll each ability score using the specified formula
        const abilities = ['str', 'int', 'wis', 'dex', 'con', 'cha'];
        for (const ability of abilities) {
            const roll = new Roll(formula);
            await CodeMigrate.rollEvaluate(roll);
            // Set the rolled value to the character data
            characterData.abilities[ability].value = roll.total;
        }
    }
}
